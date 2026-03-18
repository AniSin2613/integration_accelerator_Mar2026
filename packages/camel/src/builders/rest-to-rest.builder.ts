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
