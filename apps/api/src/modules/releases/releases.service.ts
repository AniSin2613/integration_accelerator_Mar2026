import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CamelService } from '../camel/camel.service';
import { AuditService } from '../audit/audit.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly camel: CamelService,
    private readonly audit: AuditService,
  ) {}

  async findByIntegration(integrationDefId: string) {
    const rows = await this.prisma.releaseArtifact.findMany({
      where: { integrationDefId },
      include: {
        environmentReleases: { include: { environment: true } },
        approvalRequests: {
          include: {
            requestedBy: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      ...row,
      approvals: row.approvalRequests.map((r) => ({
        id: r.id,
        status: r.status,
        approver: r.requestedBy,
      })),
    }));
  }

  async createArtifactByIntegrationId(integrationDefId: string, dto?: Partial<CreateReleaseDto>) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id: integrationDefId },
      select: { id: true, workspaceId: true },
    });
    if (!integration) throw new NotFoundException(`Integration ${integrationDefId} not found`);

    const existingCount = await this.prisma.releaseArtifact.count({
      where: { integrationDefId },
    });

    const version = dto?.version ?? `v1.0.${existingCount + 1}`;
    return this.createArtifact(integration.workspaceId, integrationDefId, { version });
  }

  /**
   * Create a release artifact from the approved mapping set.
   * Generates the Camel YAML and snapshots the mapping state.
   *
   * Only callable from Dev — structural creation blocked in Test/Prod.
   */
  async createArtifact(
    workspaceId: string,
    integrationDefId: string,
    dto: CreateReleaseDto,
  ) {
    // Load integration + latest approved mapping set
    const integration = await this.prisma.integrationDefinition.findFirst({
      where: { id: integrationDefId, workspaceId },
      include: {
        templateDef: true,
        mappingSets: {
          where: { isApproved: true },
          orderBy: { version: 'desc' },
          take: 1,
          include: { rules: true },
        },
      },
    });

    if (!integration) throw new NotFoundException(`Integration ${integrationDefId} not found`);

    const approvedSet = integration.mappingSets[0];
    if (!approvedSet) {
      throw new BadRequestException(
        'No approved mapping set found. Approve all mapping rules and the mapping set before creating a release.',
      );
    }

    const blockedByProfileLifecycle =
      integration.sourceProfileUpdateStatus === 'END_OF_SUPPORT' ||
      integration.targetProfileUpdateStatus === 'END_OF_SUPPORT' ||
      integration.sourceProfileUpdateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
      integration.targetProfileUpdateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
      integration.sourceProfileImpactLevel === 'BLOCKING' ||
      integration.targetProfileImpactLevel === 'BLOCKING';

    if (blockedByProfileLifecycle) {
      throw new ForbiddenException(
        'Release is blocked by profile lifecycle status. Review update notices and complete profile rebase/review before release.',
      );
    }

    // Generate Camel YAML — REST-to-REST for the vertical slice template
    // In future phases this will dispatch to template-specific builders
    const camelYaml = this.camel.generateRestToRestYaml({
      routeId: `${integrationDefId}-v${dto.version}`,
      description: `${integration.name} — v${dto.version}`,
      sourceBaseUrl: 'https://{{source.base-url}}',
      sourcePath: '{{source.path}}',
      targetBaseUrl: 'https://{{target.base-url}}',
      targetPath: '{{target.path}}',
      httpMethod: 'POST',
      fieldMappings: approvedSet.rules.map((r) => ({
        sourceField: r.sourceField,
        targetField: r.targetField,
        transformType: (r.transformConfig as any)?.type,
        transformConfig: r.transformConfig as Record<string, unknown>,
      })),
    });

    return this.prisma.releaseArtifact.create({
      data: {
        workspaceId,
        integrationDefId,
        version: dto.version,
        camelYaml,
        mappingSnapshot: approvedSet.snapshotJson ?? {},
        sourceEffectiveProfileVersionId: integration.pinnedSourceEffectiveProfileVersionId,
        targetEffectiveProfileVersionId: integration.pinnedTargetEffectiveProfileVersionId,
        sourceSchemaHash: integration.sourceSchemaHash,
        targetSchemaHash: integration.targetSchemaHash,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Submit a release artifact for approval.
   */
  async submitForApproval(artifactId: string, requestedByUserId: string, dto: SubmitApprovalDto) {
    const artifact = await this.prisma.releaseArtifact.findUnique({ where: { id: artifactId } });
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    if (artifact.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT artifacts can be submitted for approval');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.releaseArtifact.update({
        where: { id: artifactId },
        data: { status: 'SUBMITTED' },
      }),
      this.prisma.approvalRequest.create({
        data: {
          releaseArtifactId: artifactId,
          requestedByUserId,
          status: 'SUBMITTED',
          notes: dto.notes,
        },
      }),
    ]);

    return updated;
  }

  /**
   * Approve a release artifact.
   */
  async approve(artifactId: string, reviewerUserId: string) {
    const artifact = await this.prisma.releaseArtifact.findUnique({ where: { id: artifactId } });
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    if (artifact.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED artifacts can be approved');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.releaseArtifact.update({
        where: { id: artifactId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.approvalRequest.updateMany({
        where: { releaseArtifactId: artifactId, status: 'SUBMITTED' },
        data: { status: 'APPROVED', reviewedByUserId: reviewerUserId, reviewedAt: new Date() },
      }),
    ]);

    this.audit.log({
      tenantId: 'system',
      userId: reviewerUserId,
      action: 'RELEASE_APPROVED',
      entityType: 'ReleaseArtifact',
      entityId: artifactId,
    }).catch((err) => this.logger.error('Failed to write audit log for RELEASE_APPROVED', err));

    return updated;
  }

  /**
   * Promote (deploy) an approved artifact to an environment.
   * Enforces the Dev → Test → Prod promotion path.
   */
  async promote(artifactId: string, targetEnvironmentId: string, deployingUserId: string) {
    const artifact = await this.prisma.releaseArtifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    if (artifact.status !== 'APPROVED') {
      throw new ForbiddenException('Only APPROVED artifacts can be promoted');
    }

    const environment = await this.prisma.environment.findUnique({
      where: { id: targetEnvironmentId },
      include: {
        environmentReleases: {
          include: { releaseArtifact: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!environment) throw new NotFoundException(`Environment ${targetEnvironmentId} not found`);

    // Enforce promotion ordering: TEST requires THIS artifact deployed in DEV; PROD requires TEST
    if (environment.type === 'TEST') {
      const devEnv = await this.prisma.environment.findFirst({
        where: { workspaceId: environment.workspaceId, type: 'DEV' },
        include: {
          environmentReleases: {
            where: { releaseArtifactId: artifactId },
            take: 1,
          },
        },
      });
      if (!devEnv || devEnv.environmentReleases.length === 0) {
        throw new ForbiddenException('This artifact must be deployed to DEV before TEST');
      }
    }

    if (environment.type === 'PROD') {
      const testEnv = await this.prisma.environment.findFirst({
        where: { workspaceId: environment.workspaceId, type: 'TEST' },
        include: {
          environmentReleases: {
            where: { releaseArtifactId: artifactId },
            take: 1,
          },
        },
      });
      if (!testEnv || testEnv.environmentReleases.length === 0) {
        throw new ForbiddenException('This artifact must be deployed to TEST before PROD');
      }
    }

    const envRelease = await this.prisma.environmentRelease.create({
      data: {
        releaseArtifactId: artifactId,
        environmentId: targetEnvironmentId,
        deployedAt: new Date(),
        deployedByUserId: deployingUserId,
      },
    });

    // Mark artifact as deployed
    await this.prisma.releaseArtifact.update({
      where: { id: artifactId },
      data: { status: 'DEPLOYED' },
    });

    this.audit.log({
      tenantId: 'system',
      userId: deployingUserId,
      action: 'RELEASE_DEPLOYED',
      entityType: 'ReleaseArtifact',
      entityId: artifactId,
      details: { environmentId: targetEnvironmentId, environmentType: environment.type },
    }).catch((err) => this.logger.error('Failed to write audit log for RELEASE_DEPLOYED', err));

    return envRelease;
  }

  async promoteNext(artifactId: string, deployingUserId: string) {
    const artifact = await this.prisma.releaseArtifact.findUnique({
      where: { id: artifactId },
      include: {
        integrationDef: { select: { workspaceId: true } },
        environmentReleases: { include: { environment: true } },
      },
    });
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);

    const deployedTypes = new Set(artifact.environmentReleases.map((r) => r.environment.type));
    const nextType = !deployedTypes.has('DEV')
      ? 'DEV'
      : !deployedTypes.has('TEST')
      ? 'TEST'
      : !deployedTypes.has('PROD')
      ? 'PROD'
      : null;

    if (!nextType) {
      throw new BadRequestException('Artifact already promoted to PROD');
    }

    const nextEnv = await this.prisma.environment.findFirst({
      where: { workspaceId: artifact.integrationDef.workspaceId, type: nextType },
      select: { id: true },
    });
    if (!nextEnv) throw new NotFoundException(`Environment ${nextType} not found`);

    return this.promote(artifactId, nextEnv.id, deployingUserId);
  }
}
