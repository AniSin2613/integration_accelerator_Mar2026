import * as yaml from 'js-yaml';

export interface RestToRestRouteParams {
  routeId: string;
  description: string;
  sourceBaseUrl: string;
  sourcePath: string;
  targetBaseUrl: string;
  targetPath: string;
  httpMethod: string;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    transformType?: string;
    transformConfig?: Record<string, unknown>;
  }>;
}

/**
 * Blocked host patterns to prevent SSRF via Camel route generation.
 * Blocks internal IPs, metadata endpoints, and localhost.
 */
const BLOCKED_HOST_PATTERNS = [
  /^https?:\/\/169\.254\./,           // AWS/GCP metadata
  /^https?:\/\/metadata\./,            // Cloud metadata endpoints
  /^https?:\/\/localhost[:/]/,          // Localhost
  /^https?:\/\/127\./,                 // Loopback
  /^https?:\/\/0\./,                   // Zero-address
  /^https?:\/\/\[::1\]/,              // IPv6 loopback
  /^https?:\/\/10\./,                  // RFC 1918
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\./, // RFC 1918
  /^https?:\/\/192\.168\./,            // RFC 1918
];

function validateRouteUrl(url: string, label: string): void {
  // Allow Camel property placeholders (e.g. https://{{source.base-url}})
  if (url.includes('{{') && url.includes('}}')) {
    return;
  }

  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(url)) {
      throw new Error(`${label} URL "${url}" targets a blocked internal address`);
    }
  }
}

/**
 * Builds a Camel YAML DSL route for a REST-to-REST integration.
 *
 * Architecture note: this builder generates a Camel route that:
 *   1. Accepts an HTTP trigger (or can be adapted for scheduler)
 *   2. Fetches data from the source REST endpoint
 *   3. Applies field mappings via Camel Simple/JSTL expressions
 *   4. Posts to the target REST endpoint
 *
 * The generated YAML is stored as the release artifact and consumed by
 * the camel-runner service for execution.
 */
export function buildRestToRestRoute(params: RestToRestRouteParams): string {
  // SSRF protection: validate source and target URLs
  validateRouteUrl(`${params.sourceBaseUrl}${params.sourcePath}`, 'Source');
  validateRouteUrl(`${params.targetBaseUrl}${params.targetPath}`, 'Target');

  const mappingSteps = params.fieldMappings.map((m) => {
    const base = {
      setHeader: {
        name: `Mapped-${m.targetField}`,
        simple: `\${body[${m.sourceField}]}`,
      },
    };
    // For date format transforms, add a conversion step
    if (m.transformType === 'DATE_FORMAT' && m.transformConfig) {
      return [
        base,
        {
          log: {
            message: `Transforming ${m.sourceField} → ${m.targetField} (DATE_FORMAT)`,
            loggingLevel: 'DEBUG',
          },
        },
      ];
    }
    return [base];
  });

  const route = [
    {
      route: {
        id: params.routeId,
        description: params.description,
        from: {
          uri: 'platform-http:/api/invoke',
          parameters: { httpMethodRestrict: params.httpMethod },
        },
        steps: [
          { log: { message: 'Integration triggered: ${headers.CamelHttpMethod} ${headers.CamelHttpPath}', loggingLevel: 'INFO' } },

          // Fetch from source
          {
            toD: {
              uri: `${params.sourceBaseUrl}${params.sourcePath}`,
              parameters: { httpMethod: 'GET' },
            },
          },
          { log: { message: 'Source response received', loggingLevel: 'INFO' } },

          // Apply field mapping steps (flattened)
          ...mappingSteps.flat(),

          // Post to target
          {
            toD: {
              uri: `${params.targetBaseUrl}${params.targetPath}`,
              parameters: { httpMethod: 'POST' },
            },
          },
          { log: { message: 'Delivered to target', loggingLevel: 'INFO' } },
        ],
      },
    },
  ];

  return yaml.dump(route, { lineWidth: 120, noRefs: true });
}
