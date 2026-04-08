import { Injectable, Logger } from '@nestjs/common';
import { RuntimeIssueType, DriftSuggestionType, DriftSuggestedChange } from '@prisma/client';
import { NormalizedIssue } from './error-normalization.service';
import { EffectiveField } from './effective-schema-resolver.service';

/**
 * Result of comparing a normalized issue against the effective schema.
 */
export interface MismatchResult {
  /** Whether drift is suspected based on schema comparison */
  driftSuspected: boolean;
  /** The drift suggestion type to create (null if no drift) */
  suggestionType: DriftSuggestionType | null;
  /** The suggested change action */
  suggestedChange: DriftSuggestedChange | null;
  /** Adjusted confidence (may differ from normalized issue confidence) */
  confidence: number;
  /** Human-readable explanation of the mismatch */
  reason: string;
}

@Injectable()
export class MismatchDetectionService {
  private readonly logger = new Logger(MismatchDetectionService.name);

  /**
   * Compare a normalized issue against the current effective schema fields.
   * Determines whether the issue represents plausible schema drift.
   *
   * Only creates drift suggestions when mismatch against effective schema is plausible.
   * Returns driftSuspected=false for issues that don't indicate schema problems.
   */
  detect(
    issue: NormalizedIssue,
    effectiveFields: EffectiveField[],
  ): MismatchResult {
    const fieldMap = new Map(effectiveFields.map((f) => [f.path, f]));

    switch (issue.issueType) {
      case RuntimeIssueType.MISSING_REQUIRED_FIELD:
        return this.detectMissingRequired(issue, fieldMap);

      case RuntimeIssueType.UNKNOWN_FIELD:
        return this.detectUnknownField(issue, fieldMap);

      case RuntimeIssueType.INVALID_TYPE_OR_FORMAT:
        return this.detectTypeFormatMismatch(issue, fieldMap);

      case RuntimeIssueType.FORBIDDEN_VALUE:
        return this.detectForbiddenValue(issue, fieldMap);

      case RuntimeIssueType.TARGET_CONTRACT_MISMATCH:
        return this.detectContractMismatch(issue);

      case RuntimeIssueType.BUSINESS_RULE_REJECTION:
        return this.detectBusinessRuleRejection(issue, fieldMap);

      // Auth issues and unknown errors don't indicate schema drift
      case RuntimeIssueType.AUTH_OR_PERMISSION_ISSUE:
      case RuntimeIssueType.UNKNOWN_TARGET_ERROR:
      default:
        return {
          driftSuspected: false,
          suggestionType: null,
          suggestedChange: null,
          confidence: 0,
          reason: `Issue type ${issue.issueType} does not indicate schema drift`,
        };
    }
  }

  /**
   * Target says field is required, but our effective schema says optional.
   * → Drift: field should be marked customer_required.
   */
  private detectMissingRequired(
    issue: NormalizedIssue,
    fieldMap: Map<string, EffectiveField>,
  ): MismatchResult {
    if (!issue.fieldPath) {
      return {
        driftSuspected: false,
        suggestionType: null,
        suggestedChange: null,
        confidence: 0,
        reason: 'Missing required field error but no field path identified',
      };
    }

    const field = fieldMap.get(issue.fieldPath);

    if (!field) {
      // Field not in schema at all — may be a new required field
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.NEW_FIELD,
        suggestedChange: DriftSuggestedChange.MARK_CUSTOMER_REQUIRED,
        confidence: Math.min(issue.confidence * 0.9, 0.85),
        reason: `Target requires field "${issue.fieldPath}" which is not in the effective schema`,
      };
    }

    if (!field.required) {
      // Field exists but is optional in our schema, yet target requires it
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.CONSTRAINT_CHANGE,
        suggestedChange: DriftSuggestedChange.MARK_CUSTOMER_REQUIRED,
        confidence: issue.confidence,
        reason: `Field "${issue.fieldPath}" is optional in effective schema but target rejects as mandatory`,
      };
    }

    // Field is already required — this error might be about a missing value, not schema
    return {
      driftSuspected: false,
      suggestionType: null,
      suggestedChange: null,
      confidence: 0,
      reason: `Field "${issue.fieldPath}" is already required in effective schema — likely a mapping/data issue, not drift`,
    };
  }

  /**
   * Target reports an unknown/unrecognized field.
   * If the field exists in our schema as valid, the target may have deprecated it.
   */
  private detectUnknownField(
    issue: NormalizedIssue,
    fieldMap: Map<string, EffectiveField>,
  ): MismatchResult {
    if (!issue.fieldPath) {
      return {
        driftSuspected: false,
        suggestionType: null,
        suggestedChange: null,
        confidence: 0,
        reason: 'Unknown field error but no field path identified',
      };
    }

    const field = fieldMap.get(issue.fieldPath);

    if (field) {
      // Our schema says this field is valid, but target rejects it
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.DEPRECATED_FIELD,
        suggestedChange: DriftSuggestedChange.REVIEW_FIELD_VISIBILITY,
        confidence: issue.confidence,
        reason: `Field "${issue.fieldPath}" is in effective schema but target reports it as unknown/deprecated`,
      };
    }

    // Field not in our schema either — might be a custom field the customer added
    return {
      driftSuspected: true,
      suggestionType: DriftSuggestionType.NEW_FIELD,
      suggestedChange: DriftSuggestedChange.REVIEW_UNKNOWN_FIELD,
      confidence: Math.min(issue.confidence * 0.7, 0.60),
      reason: `Target reports unknown field "${issue.fieldPath}" — may be a custom field needing review`,
    };
  }

  /**
   * Type/format mismatch between what we send and what target expects.
   */
  private detectTypeFormatMismatch(
    issue: NormalizedIssue,
    fieldMap: Map<string, EffectiveField>,
  ): MismatchResult {
    if (!issue.fieldPath) {
      return {
        driftSuspected: false,
        suggestionType: null,
        suggestedChange: null,
        confidence: 0,
        reason: 'Type mismatch error but no field path identified',
      };
    }

    const field = fieldMap.get(issue.fieldPath);

    if (field) {
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.TYPE_CHANGE,
        suggestedChange: DriftSuggestedChange.REVIEW_FIELD_TYPE,
        confidence: issue.confidence,
        reason: `Field "${issue.fieldPath}" type "${field.dataType}" rejected by target — type expectation may have changed`,
      };
    }

    return {
      driftSuspected: false,
      suggestionType: null,
      suggestedChange: null,
      confidence: 0,
      reason: `Type mismatch for unknown field "${issue.fieldPath}" — not in effective schema`,
    };
  }

  /**
   * Forbidden value — could indicate a validation rule change on the target side.
   */
  private detectForbiddenValue(
    issue: NormalizedIssue,
    fieldMap: Map<string, EffectiveField>,
  ): MismatchResult {
    if (!issue.fieldPath) {
      return {
        driftSuspected: false,
        suggestionType: null,
        suggestedChange: null,
        confidence: 0,
        reason: 'Forbidden value error but no field path identified',
      };
    }

    const field = fieldMap.get(issue.fieldPath);
    if (field) {
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.CONSTRAINT_CHANGE,
        suggestedChange: DriftSuggestedChange.MARK_CONDITIONAL,
        confidence: Math.min(issue.confidence * 0.8, 0.70),
        reason: `Field "${issue.fieldPath}" value rejected by target — validation rules may have changed`,
      };
    }

    return {
      driftSuspected: false,
      suggestionType: null,
      suggestedChange: null,
      confidence: 0,
      reason: `Forbidden value for field "${issue.fieldPath}" not in effective schema`,
    };
  }

  /**
   * Contract-level mismatch — always suspicious.
   */
  private detectContractMismatch(issue: NormalizedIssue): MismatchResult {
    return {
      driftSuspected: true,
      suggestionType: DriftSuggestionType.TYPE_CHANGE,
      suggestedChange: DriftSuggestedChange.REVIEW_FIELD_TYPE,
      confidence: issue.confidence,
      reason: 'Target contract mismatch detected — API schema may have changed',
    };
  }

  /**
   * Business rule rejections may indicate constraint changes.
   */
  private detectBusinessRuleRejection(
    issue: NormalizedIssue,
    fieldMap: Map<string, EffectiveField>,
  ): MismatchResult {
    if (!issue.fieldPath) {
      return {
        driftSuspected: false,
        suggestionType: null,
        suggestedChange: null,
        confidence: 0,
        reason: 'Business rule rejection without identifiable field — insufficient evidence for drift',
      };
    }

    const field = fieldMap.get(issue.fieldPath);
    if (field) {
      return {
        driftSuspected: true,
        suggestionType: DriftSuggestionType.CONSTRAINT_CHANGE,
        suggestedChange: DriftSuggestedChange.MARK_CONDITIONAL,
        confidence: Math.min(issue.confidence * 0.7, 0.60),
        reason: `Business rule rejection on field "${issue.fieldPath}" — may indicate constraint change`,
      };
    }

    return {
      driftSuspected: false,
      suggestionType: null,
      suggestedChange: null,
      confidence: 0,
      reason: `Business rule rejection for field "${issue.fieldPath}" not in effective schema — insufficient evidence`,
    };
  }
}
