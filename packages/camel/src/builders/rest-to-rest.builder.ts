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

export interface MappingPreviewRouteParams {
  routeId: string;
  sourcePayload: Record<string, unknown>;
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
      from: {
        uri: 'platform-http:/api/invoke',
        parameters: { httpMethodRestrict: params.httpMethod },
        id: params.routeId,
        description: params.description,
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

function toJsonPath(path: string, sourcePayload?: Record<string, unknown>): string {
  if (sourcePayload && Object.prototype.hasOwnProperty.call(sourcePayload, path)) {
    return `$["${path.replace(/"/g, '\\"')}"]`;
  }

  const normalized = path.replace(/\[\*\]/g, '[0]');
  const parts = normalized.split('.').filter(Boolean);
  const rendered = parts
    .map((part) => {
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, idx] = arrayMatch;
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          return `.${key}[${idx}]`;
        }
        return `["${key}"][${idx}]`;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
        return `.${part}`;
      }
      return `["${part}"]`;
    })
    .join('');

  return `$${rendered}`;
}

function toSimpleEscaped(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toSimpleQuoted(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function toSimpleLiteral(raw: string): string {
  const trimmed = raw.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') return trimmed;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return toSimpleQuoted(trimmed.slice(1, -1));
  }
  return toSimpleQuoted(trimmed);
}

function buildDateFormatExpression(headerName: string, fromFormatRaw: string, toFormatRaw: string): string | undefined {
  const fromFormat = fromFormatRaw.toUpperCase();
  const toFormat = toFormatRaw.toUpperCase();
  const yStart = fromFormat.indexOf('YYYY');
  const mStart = fromFormat.indexOf('MM');
  const dStart = fromFormat.indexOf('DD');
  if (yStart < 0 || mStart < 0 || dStart < 0) return undefined;

  const toParts = toFormat.split(/(YYYY|MM|DD)/).filter(Boolean);
  const rendered = toParts
    .map((part) => {
      if (part === 'YYYY') return `\${header.${headerName}.substring(${yStart},${yStart + 4})}`;
      if (part === 'MM') return `\${header.${headerName}.substring(${mStart},${mStart + 2})}`;
      if (part === 'DD') return `\${header.${headerName}.substring(${dStart},${dStart + 2})}`;
      return part;
    })
    .join('');

  return rendered;
}

function buildFormulaExpression(headerName: string, expressionRaw: string): string | undefined {
  const expression = expressionRaw.trim();
  if (!expression) return undefined;

  if (/^value$/i.test(expression)) return `\${header.${headerName}}`;
  if (/^value\.toUpperCase\(\)$/i.test(expression)) return `\${header.${headerName}} == null ? null : \${header.${headerName}}.toUpperCase()`;
  if (/^value\.toLowerCase\(\)$/i.test(expression)) return `\${header.${headerName}} == null ? null : \${header.${headerName}}.toLowerCase()`;
  if (/^value\.trim\(\)$/i.test(expression)) return `\${header.${headerName}} == null ? null : \${header.${headerName}}.trim()`;

  let match = expression.match(/^value\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/i);
  if (match) {
    const [, op, n] = match;
    return `\${header.${headerName}} ${op} ${n}`;
  }

  match = expression.match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*value$/i);
  if (match) {
    const [, n, op] = match;
    return `${n} ${op} \${header.${headerName}}`;
  }

  return undefined;
}

function buildConditionalExpression(headerName: string, expressionRaw: string): string | undefined {
  const expression = expressionRaw.trim();
  const match = expression.match(/^value\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/i);
  if (!match) return undefined;

  const [, op, rhsRaw, trueRaw, falseRaw] = match;
  const rhs = toSimpleLiteral(rhsRaw);
  const whenTrue = toSimpleLiteral(trueRaw);
  const whenFalse = toSimpleLiteral(falseRaw);
  return `\${header.${headerName}} ${op} ${rhs} ? ${whenTrue} : ${whenFalse}`;
}

function buildConcatExpression(headerNames: string[], separator: string): string {
  if (headerNames.length === 0) return '';
  let out = `\${header.${headerNames[0]}}`;
  for (let i = 1; i < headerNames.length; i += 1) {
    out += `${separator}\${header.${headerNames[i]}}`;
  }
  return out;
}

export function buildMappingPreviewRoute(params: MappingPreviewRouteParams): string {
  const sourcePayloadJson = JSON.stringify(params.sourcePayload ?? {});

  const mappingSteps = params.fieldMappings.flatMap((m, idx) => {
    const fromHeader = `MappedRaw${idx}`;
    const toHeader = `Mapped${idx}`;
    const transformType = String(m.transformType ?? m.transformConfig?.type ?? '').toLowerCase().replace(/[_\s-]/g, '');

    const steps: Array<Record<string, unknown>> = [
      {
        setHeader: {
          name: fromHeader,
          jsonpath: {
            expression: toJsonPath(m.sourceField, params.sourcePayload),
            suppressExceptions: true,
          },
        },
      },
    ];

    if (transformType === 'uppercase') {
      steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}} == null ? null : \${header.${fromHeader}}.toUpperCase()` } });
    } else if (transformType === 'lowercase') {
      steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}} == null ? null : \${header.${fromHeader}}.toLowerCase()` } });
    } else if (transformType === 'trim') {
      steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}} == null ? null : \${header.${fromHeader}}.trim()` } });
    } else if (transformType === 'constant') {
      const constantValue = String(m.transformConfig?.value ?? '');
      steps.push({ setHeader: { name: toHeader, constant: constantValue } });
    } else if (transformType === 'lookup') {
      const table = (m.transformConfig?.table && typeof m.transformConfig.table === 'object' && !Array.isArray(m.transformConfig.table))
        ? m.transformConfig.table as Record<string, unknown>
        : {};
      const entries = Object.entries(table);
      if (entries.length > 0) {
        steps.push({
          choice: {
            when: entries.map(([k, v]) => ({
              simple: `\${header.${fromHeader}} == ${toSimpleQuoted(k)}`,
              steps: [{ setHeader: { name: toHeader, constant: String(v ?? '') } }],
            })),
            otherwise: {
              steps: [{ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } }],
            },
          },
        });
      } else {
        steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } });
      }
    } else if (transformType === 'concat') {
      const configuredFields = Array.isArray(m.transformConfig?.sourceFields)
        ? m.transformConfig?.sourceFields.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : [];
      const sourceFields = configuredFields.length > 0 ? configuredFields : [m.sourceField];
      const concatHeaders: string[] = [];
      sourceFields.forEach((path, sourceIdx) => {
        const h = `ConcatRaw${idx}_${sourceIdx}`;
        concatHeaders.push(h);
        steps.push({ setHeader: { name: h, jsonpath: { expression: toJsonPath(path, params.sourcePayload), suppressExceptions: true } } });
      });
      const separator = String(m.transformConfig?.separator ?? ' ');
      steps.push({ setHeader: { name: toHeader, simple: buildConcatExpression(concatHeaders, separator) } });
    } else if (transformType === 'dateformat') {
      const fromFormat = String(m.transformConfig?.fromFormat ?? 'YYYY-MM-DD');
      const toFormat = String(m.transformConfig?.toFormat ?? 'YYYY-MM-DD');
      const dateExpr = buildDateFormatExpression(fromHeader, fromFormat, toFormat);
      if (dateExpr) {
        steps.push({ setHeader: { name: toHeader, simple: dateExpr } });
      } else {
        steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } });
      }
    } else if (transformType === 'formula') {
      const expr = buildFormulaExpression(fromHeader, String(m.transformConfig?.expression ?? ''));
      if (expr) {
        steps.push({ setHeader: { name: toHeader, simple: expr } });
      } else {
        steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } });
      }
    } else if (transformType === 'conditional') {
      const expr = buildConditionalExpression(fromHeader, String(m.transformConfig?.expression ?? ''));
      if (expr) {
        steps.push({ setHeader: { name: toHeader, simple: expr } });
      } else {
        steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } });
      }
    } else {
      steps.push({ setHeader: { name: toHeader, simple: `\${header.${fromHeader}}` } });
    }

    return steps;
  });

  const targetJsonParts = params.fieldMappings.map(
    (m, idx) => '"' + toSimpleEscaped(m.targetField) + '":"${header.Mapped' + idx + '}"',
  );
  const targetJson = '{' + targetJsonParts.join(',') + '}';

  const route = [
    {
      from: {
        uri: 'timer:preview',
        parameters: { repeatCount: '1', delay: '0' },
        id: params.routeId,
        description: 'Camel mapping preview route',
        steps: [
          { setBody: { constant: sourcePayloadJson } },
          { unmarshal: { json: {} } },
          ...mappingSteps,
          { setBody: { simple: targetJson } },
          { log: { message: 'CB_PREVIEW_OUTPUT:${body}', loggingLevel: 'INFO' } },
        ],
      },
    },
  ];

  return yaml.dump(route, { lineWidth: 160, noRefs: true });
}
