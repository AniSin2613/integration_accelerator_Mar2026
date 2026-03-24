import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildRestToRestRoute, RestToRestRouteParams } from '@cogniviti/camel';

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

@Injectable()
export class CamelService {
  private readonly logger = new Logger(CamelService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Generate a Camel YAML artifact for a REST-to-REST integration.
   * The returned string is the complete YAML that gets stored as a ReleaseArtifact.
   */
  generateRestToRestYaml(params: RestToRestRouteParams): string {
    return buildRestToRestRoute(params);
  }

  /**
   * Trigger execution of a route file on the camel-runner service.
   * The route file must already be written to the shared volume before calling this.
   *
   * @param routeFilePath  Absolute path inside the camel-runner container (e.g. /app/routes/xyz.yaml)
   */
  async triggerExecution(routeFilePath: string): Promise<{ status: string; output?: string }> {
    const runnerUrl = this.config.get<string>('CAMEL_RUNNER_URL') ?? 'http://localhost:8080';
    const runnerSecret = this.config.get<string>('CAMEL_RUNNER_SECRET') ?? '';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (runnerSecret) headers['X-Runner-Secret'] = runnerSecret;

      const response = await fetch(`${runnerUrl}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ route: routeFilePath }),
        signal: AbortSignal.timeout(30_000),
      });

      const body = (await response.json()) as { status: string; output?: string; error?: string };
      this.logger.log(`Camel runner responded: ${body.status}`);
      return body;
    } catch (err) {
      this.logger.error('Failed to reach camel-runner', err);
      return { status: 'unreachable', output: String(err) };
    }
  }

  async runEphemeralConnectionTest(request: ConnectionTestRequest): Promise<ConnectionTestResponse> {
    const runnerUrl = this.config.get<string>('CAMEL_RUNNER_URL') ?? 'http://localhost:8080';
    const runnerSecret = this.config.get<string>('CAMEL_RUNNER_SECRET') ?? '';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (runnerSecret) headers['X-Runner-Secret'] = runnerSecret;

      const response = await fetch(`${runnerUrl}/connections/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'ephemeral',
          family: request.family,
          environmentId: request.environmentId,
          config: request.config,
          safePolicy: request.safePolicy,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => 'Failed to parse response body');
        return {
          status: 'failed',
          testedAt: new Date().toISOString(),
          summaryMessage: 'Camel test route execution failed',
          details: {
            httpStatus: response.status,
            body,
            family: request.family,
            environmentId: request.environmentId,
          },
        };
      }

      const body = (await response.json()) as ConnectionTestResponse;
      return {
        status: body.status,
        testedAt: body.testedAt ?? new Date().toISOString(),
        latencyMs: body.latencyMs ?? null,
        summaryMessage: body.summaryMessage,
        details: {
          ...body.details,
          ephemeralRoute: true,
        },
      };
    } catch (err) {
      this.logger.warn('Camel connection test endpoint unreachable; returning normalized warning result');
      return {
        status: 'warning',
        testedAt: new Date().toISOString(),
        summaryMessage: 'Camel runner unavailable. Returned policy-level validation only.',
        details: {
          family: request.family,
          environmentId: request.environmentId,
          safePolicy: request.safePolicy,
          camelRunnerReachable: false,
          error: String(err),
          ephemeralRoute: true,
        },
      };
    }
  }
}
