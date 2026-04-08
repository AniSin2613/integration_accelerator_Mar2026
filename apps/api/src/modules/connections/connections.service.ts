import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionFamily as PrismaConnectionFamily, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { BindConnectionDto } from './dto/bind-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { CamelService } from '../camel/camel.service';

type ConnectionHealthStatus = 'healthy' | 'warning' | 'failed' | 'untested';

export interface NormalizedConnectionTestResult {
  connectionId: string;
  environmentId: string;
  status: ConnectionHealthStatus;
  testedAt: string;
  latencyMs: number | null;
  summaryMessage: string;
  details: Record<string, unknown>;
}

const REST_AUTH_METHODS = ['None', 'API Key', 'Basic', 'Bearer Token', 'OAuth 2.0', 'Mutual TLS'] as const;
const REST_TEST_METHODS = ['GET', 'HEAD', 'POST'] as const;
const SFTP_AUTH_MODES = ['Password', 'Private Key'] as const;
const S3_CREDENTIAL_MODES = ['Access Key / Secret Key', 'Profile / Default Credentials'] as const;

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly camel: CamelService,
  ) {}

  async findAllFlat(workspaceSlug?: string) {
    const rows = await this.prisma.connectionDefinition.findMany({
      where: workspaceSlug
        ? {
            deletedAt: null,
            workspace: {
              slug: workspaceSlug,
            },
          }
        : { deletedAt: null },
      include: {
        workspace: true,
        envBindings: true,
        testHistory: { orderBy: { testedAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toConnectionListItem(row));
  }

  async findByWorkspace(workspaceId: string) {
    const rows = await this.prisma.connectionDefinition.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        workspace: true,
        envBindings: true,
        testHistory: { orderBy: { testedAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toConnectionListItem(row));
  }

  async findOne(workspaceId: string, connectionId: string) {
    const conn = await this.prisma.connectionDefinition.findFirst({
      where: { id: connectionId, workspaceId, deletedAt: null },
      include: {
        envBindings: { include: { environment: true } },
        testHistory: { orderBy: { testedAt: 'desc' }, take: 5 },
      },
    });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);
    return this.toConnectionDetail(conn);
  }

  async findOneFlat(connectionId: string) {
    const conn = await this.prisma.connectionDefinition.findFirst({
      where: { id: connectionId, deletedAt: null },
      include: {
        workspace: true,
        envBindings: { include: { environment: true } },
        testHistory: { orderBy: { testedAt: 'desc' }, take: 5 },
      },
    });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);
    return this.toConnectionDetail(conn);
  }

  async create(workspaceId: string, dto: CreateConnectionDto) {
    const normalizedConfig = this.normalizeAndValidateConfig(dto.family, dto.config, dto.platformLabel);

    return this.prisma.connectionDefinition.create({
      data: {
        workspaceId,
        name: dto.name,
        family: dto.family as PrismaConnectionFamily,
        config: normalizedConfig as Prisma.InputJsonValue,
      },
    });
  }

  async createFlat(dto: CreateConnectionDto) {
    const workspaceId = await this.resolveWorkspaceId(dto.workspaceId, dto.workspaceSlug);
    return this.create(workspaceId, dto);
  }

  async update(workspaceId: string, connectionId: string, dto: UpdateConnectionDto) {
    const existing = await this.prisma.connectionDefinition.findFirst({
      where: { id: connectionId, workspaceId },
    });
    if (!existing) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }

    const family = dto.family ?? existing.family;
    const incomingConfig = dto.config ?? this.readJsonObject(existing.config);
    const existingPlatformLabel = this.readPlatformLabel(this.readJsonObject(existing.config));
    const normalizedConfig = this.normalizeAndValidateConfig(
      family,
      incomingConfig,
      dto.platformLabel ?? existingPlatformLabel,
    );

    return this.prisma.connectionDefinition.update({
      where: { id: connectionId },
      data: {
        name: dto.name ?? existing.name,
        family: family as PrismaConnectionFamily,
        config: normalizedConfig as Prisma.InputJsonValue,
      },
    });
  }

  async updateFlat(connectionId: string, dto: UpdateConnectionDto) {
    const existing = await this.prisma.connectionDefinition.findFirst({ where: { id: connectionId, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    return this.update(existing.workspaceId, connectionId, dto);
  }

  async softDeleteFlat(connectionId: string) {
    const existing = await this.prisma.connectionDefinition.findFirst({ where: { id: connectionId, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    await this.prisma.connectionDefinition.update({
      where: { id: connectionId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async bindToEnvironment(connectionId: string, environmentId: string, dto: BindConnectionDto) {
    return this.prisma.connectionEnvBinding.upsert({
      where: { connectionDefId_environmentId: { connectionDefId: connectionId, environmentId } },
      update: { secretRef: dto.secretRef, overrideConfig: dto.overrideConfig as Prisma.InputJsonValue | undefined },
      create: { connectionDefId: connectionId, environmentId, secretRef: dto.secretRef, overrideConfig: dto.overrideConfig as Prisma.InputJsonValue | undefined },
    });
  }

  async testConnection(connectionId: string, environmentId: string): Promise<NormalizedConnectionTestResult> {
    const conn = await this.prisma.connectionDefinition.findUnique({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);

    const config = this.readJsonObject(conn.config);
    const camelResult = await this.camel.runEphemeralConnectionTest({
      family: String(conn.family),
      environmentId,
      config,
      safePolicy: this.safeTestPolicy(conn.family),
    });

    const status = this.mapCamelTestStatus(camelResult.status);
    const testedAt = camelResult.testedAt ?? new Date().toISOString();
    const normalized: NormalizedConnectionTestResult = {
      connectionId,
      environmentId,
      status,
      testedAt,
      latencyMs: camelResult.latencyMs ?? null,
      summaryMessage: camelResult.summaryMessage,
      details: camelResult.details,
    };

    await this.prisma.connectionTestHistory.create({
      data: {
        connectionDefId: connectionId,
        environmentId,
        success: status === 'healthy',
        errorMessage: status !== 'healthy'
          ? `${status === 'warning' ? '[warning] ' : ''}${normalized.summaryMessage}`
          : undefined,
      },
    });

    return normalized;
  }

  async testConnectionDefault(connectionId: string, environmentId?: string) {
    const conn = await this.prisma.connectionDefinition.findUnique({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);

    if (environmentId) {
      const environment = await this.prisma.environment.findFirst({
        where: { id: environmentId, workspaceId: conn.workspaceId },
      });
      if (!environment) {
        throw new NotFoundException(`Environment ${environmentId} not found for this workspace`);
      }
      return this.testConnection(connectionId, environmentId);
    }

    const binding = await this.prisma.connectionEnvBinding.findFirst({
      where: { connectionDefId: connectionId },
      include: { environment: true },
      orderBy: { createdAt: 'asc' },
    });

    if (binding) {
      return this.testConnection(connectionId, binding.environmentId);
    }

    const fallbackEnvironment = await this.prisma.environment.findFirst({
      where: { workspaceId: conn.workspaceId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    if (!fallbackEnvironment) {
      throw new NotFoundException(`No environment found for workspace ${conn.workspaceId}`);
    }

    return this.testConnection(connectionId, fallbackEnvironment.id);
  }

  private async resolveWorkspaceId(workspaceId?: string, workspaceSlug?: string): Promise<string> {
    if (workspaceId) {
      return workspaceId;
    }

    if (workspaceSlug) {
      const workspace = await this.prisma.workspace.findFirst({ where: { slug: workspaceSlug } });
      if (!workspace) {
        throw new NotFoundException(`Workspace with slug ${workspaceSlug} not found`);
      }
      return workspace.id;
    }

    throw new BadRequestException('workspaceId or workspaceSlug is required');
  }

  private readJsonObject(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value == null || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readStringField(input: Record<string, unknown>, field: string, required = false): string | undefined {
    const value = input[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (required) {
      throw new BadRequestException(`${field} is required`);
    }
    return undefined;
  }

  private readNumberField(input: Record<string, unknown>, field: string, required = false): number | undefined {
    const value = input[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
    if (required) {
      throw new BadRequestException(`${field} is required`);
    }
    return undefined;
  }

  private readStringArrayField(
    input: Record<string, unknown>,
    field: string,
    required = false,
  ): string[] | undefined {
    const value = input[field];
    if (Array.isArray(value)) {
      const clean = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (clean.length > 0) {
        return clean;
      }
    }

    if (required) {
      throw new BadRequestException(`${field} is required`);
    }
    return undefined;
  }

  private readPlatformLabel(config: Record<string, unknown>): string | undefined {
    const label = config.platformLabel;
    if (typeof label === 'string' && label.trim().length > 0) {
      return label.trim();
    }
    return undefined;
  }

  private toSecretRef(rawValue: unknown, _fallbackRefName: string): string | undefined {
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      return undefined;
    }

    return rawValue.trim();
  }

  private normalizeAndValidateConfig(
    family: PrismaConnectionFamily | string,
    config: Record<string, unknown>,
    platformLabel?: string,
  ): Record<string, unknown> {
    if (family === 'SCHEDULER') {
      throw new BadRequestException('Scheduler/Cron is not supported as a reusable V1 connection');
    }

    const metadata: Record<string, unknown> = platformLabel ? { platformLabel } : {};

    if (family === 'REST_OPENAPI') {
      const baseUrl = this.readStringField(config, 'baseUrl', true)!;
      const testPathRaw = this.readStringField(config, 'testPath');
      const testMethod = (this.readStringField(config, 'testMethod') ?? 'GET').toUpperCase();
      const authMethod = this.readStringField(config, 'authMethod', true)!;
      if (!REST_TEST_METHODS.includes(testMethod as (typeof REST_TEST_METHODS)[number])) {
        throw new BadRequestException('testMethod must be one of GET, HEAD, POST');
      }
      if (!REST_AUTH_METHODS.includes(authMethod as (typeof REST_AUTH_METHODS)[number])) {
        throw new BadRequestException('authMethod must be one of None, API Key, Basic, Bearer Token, OAuth 2.0, Mutual TLS');
      }

      const testPath = testPathRaw
        ? (testPathRaw.startsWith('/') ? testPathRaw : `/${testPathRaw}`)
        : undefined;

      const normalized: Record<string, unknown> = {
        ...metadata,
        baseUrl,
        testPath,
        testMethod,
        authMethod,
        timeoutMs: this.readNumberField(config, 'timeoutMs') ?? 10000,
      };

      if (authMethod === 'API Key') {
        normalized.apiKeyName = this.readStringField(config, 'apiKeyName', true);
        normalized.apiKeyPlacement = this.readStringField(config, 'apiKeyPlacement') ?? 'Header';
        normalized.apiKeyValueRef = this.toSecretRef(
          config.apiKeyValueRef ?? config.apiKeyValue,
          'rest-api-key-value',
        );
      }

      if (authMethod === 'Basic') {
        normalized.basicUsername = this.readStringField(config, 'basicUsername', true);
        normalized.basicPasswordRef = this.toSecretRef(
          config.basicPasswordRef ?? config.basicPassword,
          'rest-basic-password',
        );
      }

      if (authMethod === 'Bearer Token') {
        normalized.bearerTokenRef = this.toSecretRef(
          config.bearerTokenRef ?? config.bearerToken,
          'rest-bearer-token',
        );
      }

      if (authMethod === 'OAuth 2.0') {
        normalized.oauthClientId = this.readStringField(config, 'oauthClientId', true);
        normalized.oauthClientSecretRef = this.toSecretRef(
          config.oauthClientSecretRef ?? config.oauthClientSecret,
          'rest-oauth-client-secret',
        );
        normalized.oauthTokenEndpoint = this.readStringField(config, 'oauthTokenEndpoint', true);
        normalized.oauthScope = this.readStringField(config, 'oauthScope');
        normalized.oauthResourceIndicator = this.readStringField(config, 'oauthResourceIndicator');
      }

      if (authMethod === 'Mutual TLS') {
        normalized.mtlsKeystoreRef = this.readStringField(config, 'mtlsKeystoreRef', true);
        normalized.mtlsSslContextRef = this.readStringField(config, 'mtlsSslContextRef', true);
      }

      // Pass through custom auth parameters (arbitrary key-value pairs)
      if (Array.isArray(config.customAuthParams)) {
        normalized.customAuthParams = (config.customAuthParams as Array<{ key: unknown; value: unknown }>)
          .filter((p) => typeof p.key === 'string' && p.key.trim().length > 0)
          .map((p) => ({ key: String(p.key).trim(), value: String(p.value ?? '').trim() }));
      }

      return normalized;
    }

    if (family === 'WEBHOOK') {
      return {
        ...metadata,
        path: this.readStringField(config, 'path', true),
        methods: this.readStringArrayField(config, 'methods', true),
        consumes: this.readStringField(config, 'consumes', true),
        sharedSecretHeader: this.readStringField(config, 'sharedSecretHeader'),
        apiKeyHeader: this.readStringField(config, 'apiKeyHeader'),
        basicAuthEnabled: Boolean(config.basicAuthEnabled),
        ipAllowlist: this.readStringField(config, 'ipAllowlist'),
      };
    }

    if (family === 'SFTP_FILE') {
      const authMode = this.readStringField(config, 'authMode', true)!;
      if (!SFTP_AUTH_MODES.includes(authMode as (typeof SFTP_AUTH_MODES)[number])) {
        throw new BadRequestException('authMode must be Password or Private Key');
      }

      const normalized: Record<string, unknown> = {
        ...metadata,
        host: this.readStringField(config, 'host', true),
        port: this.readNumberField(config, 'port', true),
        path: this.readStringField(config, 'path', true),
        username: this.readStringField(config, 'username', true),
        authMode,
      };

      if (authMode === 'Password') {
        normalized.passwordRef = this.toSecretRef(config.passwordRef ?? config.password, 'sftp-password');
      }

      if (authMode === 'Private Key') {
        normalized.privateKeyRef = this.toSecretRef(
          config.privateKeyRef ?? config.privateKey,
          'sftp-private-key',
        );
        normalized.privateKeyPassphraseRef = this.toSecretRef(
          config.privateKeyPassphraseRef ?? config.privateKeyPassphrase,
          'sftp-private-key-passphrase',
        );
      }

      return normalized;
    }

    if (family === 'JDBC_SQL') {
      const normalized: Record<string, unknown> = {
        ...metadata,
        dbEngine: this.readStringField(config, 'dbEngine', true),
        host: this.readStringField(config, 'host', true),
        port: this.readNumberField(config, 'port', true),
        databaseName:
          this.readStringField(config, 'databaseName') ?? this.readStringField(config, 'serviceName', true),
        username: this.readStringField(config, 'username', true),
        passwordRef: this.toSecretRef(config.passwordRef ?? config.password, 'database-password'),
        schema: this.readStringField(config, 'schema'),
        sslMode: this.readStringField(config, 'sslMode'),
      };

      // Product rule: reusable Database connections must not carry SQL/query text.
      delete normalized.query;
      delete normalized.queryText;
      delete normalized.sql;
      delete normalized.statement;

      return normalized;
    }

    if (family === 'S3') {
      const credentialMode =
        this.readStringField(config, 'credentialMode') ??
        'Access Key / Secret Key';

      if (!S3_CREDENTIAL_MODES.includes(credentialMode as (typeof S3_CREDENTIAL_MODES)[number])) {
        throw new BadRequestException('credentialMode must be Access Key / Secret Key or Profile / Default Credentials');
      }

      const normalized: Record<string, unknown> = {
        ...metadata,
        bucket: this.readStringField(config, 'bucket', true),
        region: this.readStringField(config, 'region', true),
        credentialMode,
        customEndpointUrl: this.readStringField(config, 'customEndpointUrl'),
        pathStyleEnabled: Boolean(config.pathStyleEnabled),
        prefix: this.readStringField(config, 'prefix'),
      };

      if (credentialMode === 'Access Key / Secret Key') {
        normalized.accessKeyRef = this.toSecretRef(config.accessKeyRef ?? config.accessKey, 's3-access-key');
        normalized.secretKeyRef = this.toSecretRef(config.secretKeyRef ?? config.secretKey, 's3-secret-key');
        normalized.sessionTokenRef = this.toSecretRef(
          config.sessionTokenRef ?? config.sessionToken,
          's3-session-token',
        );
      }

      return normalized;
    }

    throw new BadRequestException(`Unsupported connection family: ${family}`);
  }

  private mapCamelTestStatus(status: string): ConnectionHealthStatus {
    if (status === 'healthy' || status === 'ok') {
      return 'healthy';
    }

    if (status === 'warning') {
      return 'warning';
    }

    if (status === 'untested') {
      return 'untested';
    }

    return 'failed';
  }

  private safeTestPolicy(family: PrismaConnectionFamily | string): string {
    if (family === 'REST_OPENAPI') {
      return 'safe health endpoint check (no mutating operation)';
    }
    if (family === 'WEBHOOK') {
      return 'platform-http path binding availability check';
    }
    if (family === 'SFTP_FILE') {
      return 'SFTP connect and directory metadata inspection';
    }
    if (family === 'JDBC_SQL') {
      return 'lightweight datasource validation query';
    }
    if (family === 'S3') {
      return 'bucket and prefix metadata check';
    }
    return 'safe test policy';
  }

  private toFamilyLabel(family: PrismaConnectionFamily | string): string {
    if (family === 'REST_OPENAPI') {
      return 'REST / OpenAPI outbound';
    }
    if (family === 'WEBHOOK') {
      return 'Webhook / HTTP inbound';
    }
    if (family === 'SFTP_FILE') {
      return 'SFTP / File';
    }
    if (family === 'JDBC_SQL') {
      return 'Database';
    }
    if (family === 'S3') {
      return 'S3-compatible storage';
    }
    return String(family);
  }

  private toConnectionListItem(row: {
    id: string;
    name: string;
    family: PrismaConnectionFamily | string;
    config: unknown;
    updatedAt: Date;
    testHistory: { success: boolean; testedAt: Date }[];
    envBindings: { id: string }[];
  }) {
    const latestTest = row.testHistory[0];
    const config = this.readJsonObject(row.config);
    const platformLabel = this.readPlatformLabel(config);
    const health: ConnectionHealthStatus = latestTest
      ? latestTest.success
        ? 'healthy'
        : 'failed'
      : 'untested';

    // Extract only the non-sensitive baseUrl so workbenches can build resolved endpoint previews
    const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl : undefined;

    return {
      id: row.id,
      name: row.name,
      family: this.toFamilyLabel(row.family),
      platformLabel,
      health,
      lastTested: latestTest ? latestTest.testedAt.toISOString() : '--',
      updated: row.updatedAt.toISOString(),
      usedIn: row.envBindings.length,
      baseUrl,
    };
  }

  private toConnectionDetail(row: {
    id: string;
    name: string;
    family: PrismaConnectionFamily | string;
    workspaceId: string;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
    envBindings: { id: string; environmentId: string; secretRef: string | null }[];
    testHistory: { id: string; success: boolean; testedAt: Date; errorMessage: string | null }[];
  }) {
    const config = this.readJsonObject(row.config);

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      family: row.family,
      familyLabel: this.toFamilyLabel(row.family),
      platformLabel: this.readPlatformLabel(config),
      config,
      envBindings: row.envBindings,
      testHistory: row.testHistory.map((item) => {
        let status: string = item.success ? 'healthy' : 'failed';
        let summaryMessage = item.success ? 'Connection test completed' : item.errorMessage ?? 'Connection test failed';
        if (!item.success && item.errorMessage?.startsWith('[warning] ')) {
          status = 'warning';
          summaryMessage = item.errorMessage.slice('[warning] '.length);
        }
        return { id: item.id, status, testedAt: item.testedAt.toISOString(), summaryMessage };
      }),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
