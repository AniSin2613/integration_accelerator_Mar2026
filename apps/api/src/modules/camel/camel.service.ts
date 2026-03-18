import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildRestToRestRoute, RestToRestRouteParams } from '@cogniviti/camel';

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

    try {
      const response = await fetch(`${runnerUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
}
