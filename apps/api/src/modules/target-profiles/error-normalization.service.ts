import { Injectable, Logger } from '@nestjs/common';
import { RuntimeIssueType } from '@prisma/client';

/**
 * A single normalized issue extracted from a raw target response.
 */
export interface NormalizedIssue {
  issueType: RuntimeIssueType;
  fieldPath: string | null;
  confidence: number; // 0.0 – 1.0
  rawErrorExcerpt: string;
  details: Record<string, unknown>;
}

/**
 * Raw target response input for normalization.
 */
export interface RawTargetResponse {
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

// ── Deterministic classification patterns ──────────────────────────────────

interface ClassificationRule {
  issueType: RuntimeIssueType;
  /** Patterns matched against flattened error text (case-insensitive) */
  patterns: RegExp[];
  /** Attempt to extract the field path from the error text */
  fieldExtractor?: (text: string) => string | null;
  /** Base confidence when pattern matches */
  confidence: number;
}

const FIELD_PATH_RE = /(?:field|property|attribute|column|element)\s*[:\-"'`]?\s*([a-zA-Z0-9_.[\]]+)/i;

function extractFieldFromText(text: string): string | null {
  const m = text.match(FIELD_PATH_RE);
  return m ? m[1] : null;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    issueType: RuntimeIssueType.MISSING_REQUIRED_FIELD,
    patterns: [
      /required\s+(field|property|parameter)\s/i,
      /missing\s+(required|mandatory)\s/i,
      /field\s+.*\s+is\s+required/i,
      /must\s+not\s+be\s+(null|empty|blank)/i,
      /cannot\s+be\s+(null|empty|blank)/i,
    ],
    fieldExtractor: extractFieldFromText,
    confidence: 0.90,
  },
  {
    issueType: RuntimeIssueType.UNKNOWN_FIELD,
    patterns: [
      /unknown\s+(field|property|column|attribute)/i,
      /unrecognized\s+(field|property|column|attribute)/i,
      /field\s+.*\s+(not\s+found|does\s+not\s+exist|is\s+not\s+(valid|recognized))/i,
      /unexpected\s+(field|property)/i,
      /additional\s+properties?\s+not\s+allowed/i,
    ],
    fieldExtractor: extractFieldFromText,
    confidence: 0.85,
  },
  {
    issueType: RuntimeIssueType.INVALID_TYPE_OR_FORMAT,
    patterns: [
      /invalid\s+(type|format|data\s*type)/i,
      /type\s+mismatch/i,
      /expected\s+(string|number|integer|decimal|boolean|date|array|object)/i,
      /cannot\s+(convert|cast|parse)/i,
      /format\s+(error|invalid|mismatch)/i,
      /does\s+not\s+match\s+(format|pattern|schema)/i,
    ],
    fieldExtractor: extractFieldFromText,
    confidence: 0.85,
  },
  {
    issueType: RuntimeIssueType.FORBIDDEN_VALUE,
    patterns: [
      /forbidden\s+value/i,
      /value\s+not\s+(allowed|permitted|valid)/i,
      /not\s+in\s+(allowed|valid)\s+values/i,
      /enum\s+(validation|violation)/i,
      /invalid\s+enum\s+value/i,
      /out\s+of\s+range/i,
    ],
    fieldExtractor: extractFieldFromText,
    confidence: 0.80,
  },
  {
    issueType: RuntimeIssueType.BUSINESS_RULE_REJECTION,
    patterns: [
      /business\s+rule/i,
      /validation\s+rule\s+failed/i,
      /constraint\s+violation/i,
      /policy\s+(violation|rejection)/i,
      /duplicate\s+(entry|key|record)/i,
      /already\s+exists/i,
      /referential\s+integrity/i,
    ],
    fieldExtractor: extractFieldFromText,
    confidence: 0.75,
  },
  {
    issueType: RuntimeIssueType.AUTH_OR_PERMISSION_ISSUE,
    patterns: [
      /unauthorized/i,
      /forbidden/i,
      /authentication\s+(failed|required|error)/i,
      /permission\s+(denied|insufficient)/i,
      /access\s+denied/i,
      /token\s+(expired|invalid|missing)/i,
      /401\s/,
      /403\s/,
    ],
    confidence: 0.95,
  },
  {
    issueType: RuntimeIssueType.TARGET_CONTRACT_MISMATCH,
    patterns: [
      /contract\s+(mismatch|violation|changed)/i,
      /schema\s+(mismatch|validation|violation)/i,
      /api\s+version\s+(mismatch|unsupported)/i,
      /breaking\s+change/i,
      /endpoint\s+(removed|deprecated|changed)/i,
      /incompatible\s+(version|api)/i,
    ],
    confidence: 0.70,
  },
];

@Injectable()
export class ErrorNormalizationService {
  private readonly logger = new Logger(ErrorNormalizationService.name);

  /**
   * Normalize a raw target response into structured issue objects.
   * Uses deterministic pattern matching (no AI).
   */
  normalize(response: RawTargetResponse): NormalizedIssue[] {
    const issues: NormalizedIssue[] = [];
    const errorTexts = this.extractErrorTexts(response);

    if (errorTexts.length === 0) {
      return issues;
    }

    // Check for HTTP status code-based classification
    if (response.statusCode) {
      if (response.statusCode === 401 || response.statusCode === 403) {
        issues.push({
          issueType: RuntimeIssueType.AUTH_OR_PERMISSION_ISSUE,
          fieldPath: null,
          confidence: 0.95,
          rawErrorExcerpt: errorTexts[0]?.slice(0, 500) ?? `HTTP ${response.statusCode}`,
          details: { statusCode: response.statusCode },
        });
        return issues; // Auth errors don't need field-level analysis
      }
    }

    // Classify each error text against rules
    for (const text of errorTexts) {
      const truncated = text.slice(0, 500);
      let matched = false;

      for (const rule of CLASSIFICATION_RULES) {
        for (const pattern of rule.patterns) {
          if (pattern.test(text)) {
            const fieldPath = rule.fieldExtractor?.(text) ?? null;
            issues.push({
              issueType: rule.issueType,
              fieldPath,
              confidence: rule.confidence,
              rawErrorExcerpt: truncated,
              details: { matchedPattern: pattern.source },
            });
            matched = true;
            break; // First matching pattern wins for this rule
          }
        }
        if (matched) break; // First matching rule wins for this text
      }

      if (!matched) {
        issues.push({
          issueType: RuntimeIssueType.UNKNOWN_TARGET_ERROR,
          fieldPath: extractFieldFromText(text),
          confidence: 0.30,
          rawErrorExcerpt: truncated,
          details: {},
        });
      }
    }

    this.logger.debug(`Normalized ${errorTexts.length} error(s) into ${issues.length} issue(s)`);
    return issues;
  }

  /**
   * Extract human-readable error text fragments from a raw response body.
   * Handles common API error response shapes.
   */
  private extractErrorTexts(response: RawTargetResponse): string[] {
    const texts: string[] = [];
    const body = response.body;

    if (!body) return texts;

    if (typeof body === 'string') {
      if (body.trim()) texts.push(body);
      return texts;
    }

    if (typeof body !== 'object') {
      texts.push(String(body));
      return texts;
    }

    const obj = body as Record<string, unknown>;

    // Common error response patterns
    const messageKeys = ['message', 'error', 'errorMessage', 'detail', 'details', 'errors', 'error_description'];
    for (const key of messageKeys) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim()) {
        texts.push(val);
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'string' && item.trim()) {
            texts.push(item);
          } else if (typeof item === 'object' && item !== null) {
            const itemObj = item as Record<string, unknown>;
            const msg = itemObj.message ?? itemObj.error ?? itemObj.detail ?? itemObj.description;
            if (typeof msg === 'string' && msg.trim()) {
              texts.push(msg);
            } else {
              texts.push(JSON.stringify(item));
            }
          }
        }
      }
    }

    // If nothing found in common keys, stringify the whole body
    if (texts.length === 0) {
      texts.push(JSON.stringify(body).slice(0, 1000));
    }

    return texts;
  }
}
