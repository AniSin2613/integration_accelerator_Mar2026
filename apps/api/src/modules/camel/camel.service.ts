import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMappingPreviewRoute, buildRestToRestRoute, RestToRestRouteParams } from '@cogniviti/camel';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface ConnectionTestRequest {
  family: string;
  environmentId: string;
  config: Record<string, unknown>;
  safePolicy: string;
}

interface ConnectionTestResponse {
  status: 'healthy' | 'warning' | 'failed' | 'untested' | 'ok' | 'unreachable';
  testedAt?: string;
  latencyMs?: number | null;
  summaryMessage: string;
  details: Record<string, unknown>;
}

interface MappingPreviewField {
  sourceField: string;
  targetField: string;
  transformType?: string;
  transformConfig?: Record<string, unknown>;
}

@Injectable()
export class CamelService {
  private readonly logger = new Logger(CamelService.name);

  constructor(private readonly config: ConfigService) {}

  private getRunnerUrlCandidates(): string[] {
    const configured = (this.config.get<string>('CAMEL_RUNNER_URL') ?? 'http://localhost:8080').trim();
    const candidates = [configured, 'http://127.0.0.1:8080', 'http://localhost:8080', 'http://camel-runner:8080'];
    return [...new Set(candidates.filter(Boolean))];
  }

  private parseRunnerJson<T>(rawBody: string): T {
    try {
      return JSON.parse(rawBody) as T;
    } catch {
      const trimmed = rawBody.trim();
      const openBraces = (trimmed.match(/\{/g) ?? []).length;
      const closeBraces = (trimmed.match(/\}/g) ?? []).length;
      const openBrackets = (trimmed.match(/\[/g) ?? []).length;
      const closeBrackets = (trimmed.match(/\]/g) ?? []).length;

      const repaired = `${trimmed}${'}'.repeat(Math.max(0, openBraces - closeBraces))}${']'.repeat(Math.max(0, openBrackets - closeBrackets))}`;
      return JSON.parse(repaired) as T;
    }
  }

  private async postJson(urlString: string, payload: unknown, headers: Record<string, string>, timeoutMs: number): Promise<{ statusCode: number; body: string }> {
    const script = `
const url = process.argv[1];
const payload = JSON.parse(process.env.CB_PAYLOAD_JSON || '{}');
const headers = JSON.parse(process.env.CB_HEADERS_JSON || '{}');

fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
}).then(async (res) => {
  const body = await res.text();
  process.stdout.write(JSON.stringify({ statusCode: res.status, body }));
}).catch((err) => {
  process.stderr.write(String(err));
  process.exit(1);
});`;

    const { stdout } = await execFileAsync(process.execPath, ['-e', script, urlString], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        CB_PAYLOAD_JSON: JSON.stringify(payload),
        CB_HEADERS_JSON: JSON.stringify(headers),
      },
    });

    const parsed = JSON.parse(stdout) as { statusCode: number; body: string };
    return { statusCode: parsed.statusCode, body: parsed.body };
  }

  /**
   * Generate a Camel YAML artifact for a REST-to-REST integration.
   * The returned string is the complete YAML that gets stored as a ReleaseArtifact.
   */
  generateRestToRestYaml(params: RestToRestRouteParams): string {
    return buildRestToRestRoute(params);
  }

  private getValueAtPath(source: Record<string, unknown>, path: string): unknown {
    if (!path) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, path)) {
      return source[path];
    }

    const segments = path.split('.').filter(Boolean);
    let current: unknown = source;
    for (const segment of segments) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
    if (!path) return;
    if (Object.prototype.hasOwnProperty.call(target, path)) {
      target[path] = value;
      return;
    }

    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) return;

    let current: Record<string, unknown> = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      const existing = current[segment];
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    current[segments[segments.length - 1]] = value;
  }

  private buildPreviewSourcePayload(sourcePayload: Record<string, unknown>, fieldMappings: MappingPreviewField[]): Record<string, unknown> {
    const paths = new Set<string>();

    for (const mapping of fieldMappings) {
      if (mapping.sourceField?.trim()) {
        paths.add(mapping.sourceField.trim());
      }

      const configuredFields = Array.isArray(mapping.transformConfig?.sourceFields)
        ? mapping.transformConfig.sourceFields.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];
      configuredFields.forEach((path) => paths.add(path.trim()));
    }

    const compactPayload: Record<string, unknown> = {};
    for (const path of paths) {
      const value = this.getValueAtPath(sourcePayload, path);
      if (value !== undefined) {
        this.setValueAtPath(compactPayload, path, value);
      }
    }

    return Object.keys(compactPayload).length > 0 ? compactPayload : sourcePayload;
  }

  /**
   * Trigger execution of a route file on the camel-runner service.
   * The route file must already be written to the shared volume before calling this.
   *
   * @param routeFilePath  Absolute path inside the camel-runner container (e.g. /app/routes/xyz.yaml)
   */
  async triggerExecution(routeFilePath: string): Promise<{ status: string; output?: string }> {
    const runnerSecret = this.config.get<string>('CAMEL_RUNNER_SECRET') ?? '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (runnerSecret) headers['X-Runner-Secret'] = runnerSecret;

    for (const runnerUrl of this.getRunnerUrlCandidates()) {
      try {
        const response = await this.postJson(`${runnerUrl}/run`, { route: routeFilePath }, headers, 30_000);
        const body = this.parseRunnerJson<{ status: string; output?: string; error?: string }>(response.body);
        this.logger.log(`Camel runner responded: ${body.status} via ${runnerUrl}`);
        return body;
      } catch (err) {
        this.logger.warn(`Camel runner not reachable at ${runnerUrl}: ${String(err)}`);
      }
    }

    this.logger.error('Failed to reach camel-runner on all configured URLs');
    return { status: 'unreachable', output: 'Failed to reach camel-runner on all configured URLs' };
  }

  async runEphemeralConnectionTest(request: ConnectionTestRequest): Promise<ConnectionTestResponse> {
    const runnerSecret = this.config.get<string>('CAMEL_RUNNER_SECRET') ?? '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (runnerSecret) headers['X-Runner-Secret'] = runnerSecret;

    let lastError: unknown;
    const runnerErrors: Record<string, string> = {};
    for (const runnerUrl of this.getRunnerUrlCandidates()) {
      try {
        const response = await this.postJson(
          `${runnerUrl}/connections/test`,
          {
            mode: 'ephemeral',
            family: request.family,
            environmentId: request.environmentId,
            config: request.config,
            safePolicy: request.safePolicy,
          },
          headers,
          15_000,
        );

        if (response.statusCode < 200 || response.statusCode >= 300) {
          return {
            status: 'failed',
            testedAt: new Date().toISOString(),
            summaryMessage: 'Camel test route execution failed',
            details: {
              httpStatus: response.statusCode,
              body: response.body,
              family: request.family,
              environmentId: request.environmentId,
              runnerUrl,
            },
          };
        }

        const body = this.parseRunnerJson<ConnectionTestResponse>(response.body);
        return {
          status: body.status,
          testedAt: body.testedAt ?? new Date().toISOString(),
          latencyMs: body.latencyMs ?? null,
          summaryMessage: body.summaryMessage,
          details: {
            ...body.details,
            ephemeralRoute: true,
            runnerUrl,
          },
        };
      } catch (err) {
        lastError = err;
        runnerErrors[runnerUrl] = String(err);
        this.logger.warn(`Camel connection test endpoint unreachable at ${runnerUrl}: ${String(err)}`);
      }
    }

    this.logger.warn('Camel connection test endpoint unreachable on all configured URLs; returning normalized warning result');
    return {
      status: 'warning',
      testedAt: new Date().toISOString(),
      summaryMessage: 'Camel runner unavailable. Returned policy-level validation only.',
      details: {
        family: request.family,
        environmentId: request.environmentId,
        safePolicy: request.safePolicy,
        camelRunnerReachable: false,
        error: String(lastError ?? 'Unknown camel-runner connectivity error'),
        runnerErrors,
        triedRunnerUrls: this.getRunnerUrlCandidates(),
        ephemeralRoute: true,
      },
    };
  }

  async runMappingPreview(request: {
    sourcePayload: Record<string, unknown>;
    fieldMappings: MappingPreviewField[];
  }): Promise<Record<string, unknown>> {
    const runnerSecret = this.config.get<string>('CAMEL_RUNNER_SECRET') ?? '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (runnerSecret) headers['X-Runner-Secret'] = runnerSecret;

    const compactSourcePayload = this.buildPreviewSourcePayload(request.sourcePayload, request.fieldMappings);
    const yaml = buildMappingPreviewRoute({
      routeId: `preview-${Date.now()}`,
      sourcePayload: compactSourcePayload,
      fieldMappings: request.fieldMappings,
    });

    const runnerFailures: Array<{ runnerUrl: string; statusCode?: number; message: string }> = [];

    for (const runnerUrl of this.getRunnerUrlCandidates()) {
      try {
        const response = await this.postJson(
          `${runnerUrl}/preview-run`,
          { yaml },
          headers,
          120_000,
        );

        const body = this.parseRunnerJson<{ status: string; mappedPayload?: Record<string, unknown>; error?: string }>(response.body);
        if (response.statusCode >= 200 && response.statusCode < 300 && body.status === 'completed' && body.mappedPayload && typeof body.mappedPayload === 'object') {
          return body.mappedPayload;
        }
        runnerFailures.push({
          runnerUrl,
          statusCode: response.statusCode,
          message: body.error ?? `Runner returned status ${body.status}`,
        });
      } catch (err) {
        this.logger.warn(`Camel mapping preview endpoint unreachable at ${runnerUrl}: ${String(err)}`);
        runnerFailures.push({
          runnerUrl,
          message: String(err),
        });
      }
    }

    const notFound = runnerFailures.find((failure) => failure.statusCode === 404);
    if (notFound) {
      throw new BadGatewayException(
        `camel-runner at ${notFound.runnerUrl} does not expose /preview-run yet. Rebuild/restart camel-runner so the updated runner.sh is active.`,
      );
    }

    const firstFailure = runnerFailures[0];
    throw new ServiceUnavailableException(
      firstFailure
        ? `Failed to execute mapping preview via camel-runner (${firstFailure.runnerUrl}: ${firstFailure.message})`
        : 'Failed to execute mapping preview via camel-runner',
    );
  }
}
