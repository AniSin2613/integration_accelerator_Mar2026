import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriftSuggestionType, DriftSuggestionStatus, Prisma, OverlayType } from '@prisma/client';
import { EffectiveSchemaResolverService, EffectiveField } from './effective-schema-resolver.service';
import { ErrorNormalizationService, RawTargetResponse, NormalizedIssue } from './error-normalization.service';
import { MismatchDetectionService } from './mismatch-detection.service';

interface SnapshotField {
  path: string;
  dataType: string;
  required: boolean;
  businessName: string | null;
  description: string | null;
  validationRule: string | null;
  defaultValue: string | null;
  example: string | null;
  sortOrder: number;
}

interface VersionSnapshot {
  fields: SnapshotField[];
}

@Injectable()
export class DriftDetectionService {
  private readonly logger = new Logger(DriftDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: EffectiveSchemaResolverService,
    private readonly normalizer: ErrorNormalizationService,
    private readonly mismatchDetector: MismatchDetectionService,
  ) {}

  /**
   * Detect drift between the current effective schema and the last published version snapshot.
   * Creates DriftSuggestion records for any differences found.
   * Returns the number of new suggestions created.
   */
  async detectDrift(profileId: string): Promise<{ created: number; suggestions: unknown[] }> {
    const profile = await this.prisma.targetProfile.findUnique({
      where: { id: profileId },
      include: {
        currentVersion: true,
      },
    });
    if (!profile) throw new NotFoundException(`Target profile ${profileId} not found`);

    if (!profile.currentVersion) {
      return { created: 0, suggestions: [] };
    }

    const snapshot = profile.currentVersion.snapshotJson as unknown as VersionSnapshot;
    if (!snapshot?.fields) {
      return { created: 0, suggestions: [] };
    }

    // Get current effective schema
    const effective = await this.resolver.resolve(profileId);
    const currentFields = effective.fields;

    // Build lookup maps
    const snapshotMap = new Map<string, SnapshotField>();
    for (const f of snapshot.fields) {
      snapshotMap.set(f.path, f);
    }

    const currentMap = new Map<string, EffectiveField>();
    for (const f of currentFields) {
      currentMap.set(f.path, f);
    }

    // Clear existing unapplied suggestions for this profile to avoid duplicates
    await this.prisma.driftSuggestion.deleteMany({
      where: { targetProfileId: profileId, isApplied: false },
    });

    const newSuggestions: Array<{
      targetProfileId: string;
      fieldPath: string;
      suggestionType: DriftSuggestionType;
      details: Prisma.InputJsonValue;
    }> = [];

    // Detect NEW_FIELD: in current but not in snapshot
    for (const [path, field] of currentMap) {
      if (!snapshotMap.has(path)) {
        newSuggestions.push({
          targetProfileId: profileId,
          fieldPath: path,
          suggestionType: DriftSuggestionType.NEW_FIELD,
          details: {
            dataType: field.dataType,
            required: field.required,
            businessName: field.businessName,
            source: field.source,
          } as unknown as Prisma.InputJsonValue,
        });
      }
    }

    // Detect DEPRECATED_FIELD: in snapshot but not in current
    for (const [path, field] of snapshotMap) {
      if (!currentMap.has(path)) {
        newSuggestions.push({
          targetProfileId: profileId,
          fieldPath: path,
          suggestionType: DriftSuggestionType.DEPRECATED_FIELD,
          details: {
            previousDataType: field.dataType,
            wasRequired: field.required,
            previousBusinessName: field.businessName,
          } as unknown as Prisma.InputJsonValue,
        });
      }
    }

    // Detect TYPE_CHANGE + CONSTRAINT_CHANGE: field exists in both but differs
    for (const [path, currentField] of currentMap) {
      const snapshotField = snapshotMap.get(path);
      if (!snapshotField) continue;

      // Type change
      if (currentField.dataType !== snapshotField.dataType) {
        newSuggestions.push({
          targetProfileId: profileId,
          fieldPath: path,
          suggestionType: DriftSuggestionType.TYPE_CHANGE,
          details: {
            previousType: snapshotField.dataType,
            currentType: currentField.dataType,
          } as unknown as Prisma.InputJsonValue,
        });
      }

      // Constraint change: required, validationRule, or defaultValue changed
      const constraintChanges: Record<string, { previous: unknown; current: unknown }> = {};

      if (currentField.required !== snapshotField.required) {
        constraintChanges.required = {
          previous: snapshotField.required,
          current: currentField.required,
        };
      }

      if ((currentField.validationRule ?? null) !== (snapshotField.validationRule ?? null)) {
        constraintChanges.validationRule = {
          previous: snapshotField.validationRule,
          current: currentField.validationRule,
        };
      }

      if ((currentField.defaultValue ?? null) !== (snapshotField.defaultValue ?? null)) {
        constraintChanges.defaultValue = {
          previous: snapshotField.defaultValue,
          current: currentField.defaultValue,
        };
      }

      if (Object.keys(constraintChanges).length > 0) {
        newSuggestions.push({
          targetProfileId: profileId,
          fieldPath: path,
          suggestionType: DriftSuggestionType.CONSTRAINT_CHANGE,
          details: constraintChanges as unknown as Prisma.InputJsonValue,
        });
      }
    }

    if (newSuggestions.length === 0) {
      return { created: 0, suggestions: [] };
    }

    // Batch create all suggestions
    await this.prisma.driftSuggestion.createMany({ data: newSuggestions });

    // Return the created suggestions
    const created = await this.prisma.driftSuggestion.findMany({
      where: { targetProfileId: profileId, isApplied: false },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Detected ${created.length} drift suggestion(s) for profile ${profileId}`);
    return { created: created.length, suggestions: created };
  }

  /** Mark a drift suggestion as applied (legacy compat). */
  async applySuggestion(suggestionId: string) {
    const suggestion = await this.prisma.driftSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException(`Drift suggestion ${suggestionId} not found`);

    return this.prisma.driftSuggestion.update({
      where: { id: suggestionId },
      data: { isApplied: true, status: DriftSuggestionStatus.APPROVED },
    });
  }

  /** Dismiss (delete) a drift suggestion. */
  async dismissSuggestion(suggestionId: string) {
    const suggestion = await this.prisma.driftSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException(`Drift suggestion ${suggestionId} not found`);

    return this.prisma.driftSuggestion.delete({ where: { id: suggestionId } });
  }

  // ── Runtime Drift: normalize → detect mismatch → create suggestion ──────

  /**
   * Process a raw target response against a target profile's effective schema.
   * 1. Normalize errors into structured issue types
   * 2. Compare each normalized issue against effective schema
   * 3. Create drift suggestions for plausible mismatches
   */
  async processRuntimeErrors(params: {
    targetProfileId: string;
    rawResponse: RawTargetResponse;
    environment?: string;
    requestRef?: string;
    responseRef?: string;
    sourceRunRef?: string;
  }): Promise<{ normalized: NormalizedIssue[]; suggestionsCreated: number }> {
    const { targetProfileId, rawResponse, environment, requestRef, responseRef, sourceRunRef } = params;

    // Step 1: Normalize the raw response
    const normalized = this.normalizer.normalize(rawResponse);
    if (normalized.length === 0) {
      return { normalized: [], suggestionsCreated: 0 };
    }

    // Step 2: Get effective schema for comparison
    const effective = await this.resolver.resolve(targetProfileId);
    const fields = effective.fields;

    // Step 3: Detect mismatches and create suggestions
    let suggestionsCreated = 0;
    for (const issue of normalized) {
      const result = this.mismatchDetector.detect(issue, fields);

      if (result.driftSuspected && result.suggestionType && result.suggestedChange) {
        await this.prisma.driftSuggestion.create({
          data: {
            targetProfileId,
            fieldPath: issue.fieldPath ?? '__unknown__',
            suggestionType: result.suggestionType,
            details: {
              reason: result.reason,
              matchedPattern: issue.details.matchedPattern ?? null,
            } as unknown as Prisma.InputJsonValue,
            status: DriftSuggestionStatus.NEW,
            observedIssueType: issue.issueType,
            suggestedChange: result.suggestedChange,
            confidence: new Prisma.Decimal(result.confidence),
            environment: environment ?? null,
            requestRef: requestRef ?? null,
            responseRef: responseRef ?? null,
            rawErrorExcerpt: issue.rawErrorExcerpt,
            sourceRunRef: sourceRunRef ?? null,
          },
        });
        suggestionsCreated++;
      }
    }

    this.logger.log(
      `Processed ${normalized.length} normalized issue(s), created ${suggestionsCreated} drift suggestion(s) for profile ${targetProfileId}`,
    );
    return { normalized, suggestionsCreated };
  }

  // ── Review workflow: approve / reject / convert ──────────────────────────

  /**
   * List all drift suggestions with optional filtering.
   * Used by the Drift Review Queue.
   */
  async findSuggestions(filters?: {
    targetProfileId?: string;
    status?: DriftSuggestionStatus;
    system?: string;
    object?: string;
  }) {
    const where: Prisma.DriftSuggestionWhereInput = {};

    if (filters?.targetProfileId) {
      where.targetProfileId = filters.targetProfileId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.system || filters?.object) {
      where.targetProfile = {
        ...(filters.system && { system: filters.system }),
        ...(filters.object && { object: filters.object }),
      };
    }

    return this.prisma.driftSuggestion.findMany({
      where,
      include: {
        targetProfile: {
          select: {
            id: true,
            name: true,
            system: true,
            object: true,
            isPublished: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Get a single suggestion with its target profile context. */
  async findSuggestionDetail(suggestionId: string) {
    const suggestion = await this.prisma.driftSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        targetProfile: {
          select: {
            id: true,
            name: true,
            system: true,
            object: true,
            isPublished: true,
            currentVersionId: true,
          },
        },
      },
    });
    if (!suggestion) throw new NotFoundException(`Drift suggestion ${suggestionId} not found`);

    // Enrich with effective field state
    let effectiveFieldState: EffectiveField | null = null;
    try {
      const effective = await this.resolver.resolve(suggestion.targetProfileId);
      effectiveFieldState = effective.fields.find((f) => f.path === suggestion.fieldPath) ?? null;
    } catch {
      // If profile resolution fails, return without field state
    }

    return { ...suggestion, effectiveFieldState };
  }

  /** Move suggestion to IN_REVIEW status. */
  async markInReview(suggestionId: string, reviewerId: string) {
    await this.assertSuggestionExists(suggestionId);
    return this.prisma.driftSuggestion.update({
      where: { id: suggestionId },
      data: { status: DriftSuggestionStatus.IN_REVIEW, reviewedBy: reviewerId },
    });
  }

  /**
   * Approve a drift suggestion:
   * 1. Create or update overlay
   * 2. Publish new profile version
   * 3. Mark suggestion approved
   */
  async approve(suggestionId: string, reviewerId: string, note?: string) {
    const suggestion = await this.prisma.driftSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException(`Drift suggestion ${suggestionId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create overlay based on suggested change
      const overlay = await this.createOverlayForSuggestion(tx, suggestion);

      // 2. Mark suggestion approved
      const updated = await tx.driftSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: DriftSuggestionStatus.APPROVED,
          isApplied: true,
          reviewerNote: note ?? null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          overlayId: overlay?.id ?? null,
        },
      });

      return updated;
    });
  }

  /**
   * Reject a drift suggestion — preserves evidence and audit trail.
   */
  async reject(suggestionId: string, reviewerId: string, note?: string) {
    await this.assertSuggestionExists(suggestionId);
    return this.prisma.driftSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: DriftSuggestionStatus.REJECTED,
        reviewerNote: note ?? null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Convert a drift suggestion to conditional:
   * 1. Create overlay with conditional flag
   * 2. Mark suggestion as converted
   */
  async convertToConditional(suggestionId: string, reviewerId: string, note?: string) {
    const suggestion = await this.prisma.driftSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException(`Drift suggestion ${suggestionId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Create a VALIDATION_RULE overlay with conditional flag
      const overlay = await tx.targetProfileOverlay.create({
        data: {
          targetProfileId: suggestion.targetProfileId,
          overlayType: OverlayType.VALIDATION_RULE,
          config: {
            fieldPath: suggestion.fieldPath,
            rule: `conditional:${suggestion.observedIssueType ?? 'review_needed'}`,
            driftSuggestionId: suggestion.id,
          } as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      const updated = await tx.driftSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: DriftSuggestionStatus.CONVERTED_CONDITIONAL,
          isApplied: true,
          reviewerNote: note ?? null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          overlayId: overlay.id,
        },
      });

      return updated;
    });
  }

  /** Get counts of suggestions by status for a target profile. */
  async getSuggestionCounts(targetProfileId: string) {
    const counts = await this.prisma.driftSuggestion.groupBy({
      by: ['status'],
      where: { targetProfileId },
      _count: true,
    });
    const result: Record<string, number> = {
      NEW: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      CONVERTED_CONDITIONAL: 0,
    };
    for (const c of counts) {
      result[c.status] = c._count;
    }
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async createOverlayForSuggestion(
    tx: Prisma.TransactionClient,
    suggestion: { targetProfileId: string; fieldPath: string; suggestedChange: string | null; id: string; observedIssueType: string | null },
  ) {
    if (!suggestion.suggestedChange) return null;

    let overlayType: OverlayType;
    let config: Record<string, unknown>;

    switch (suggestion.suggestedChange) {
      case 'MARK_CUSTOMER_REQUIRED':
        // Use VALIDATION_RULE to mark as required
        overlayType = OverlayType.VALIDATION_RULE;
        config = {
          fieldPath: suggestion.fieldPath,
          rule: 'required:true',
          driftSuggestionId: suggestion.id,
        };
        break;

      case 'MARK_CONDITIONAL':
        overlayType = OverlayType.VALIDATION_RULE;
        config = {
          fieldPath: suggestion.fieldPath,
          rule: `conditional:${suggestion.observedIssueType ?? 'review_needed'}`,
          driftSuggestionId: suggestion.id,
        };
        break;

      case 'REVIEW_FIELD_VISIBILITY':
        overlayType = OverlayType.FIELD_VISIBILITY;
        config = {
          fieldPath: suggestion.fieldPath,
          visible: false,
          driftSuggestionId: suggestion.id,
        };
        break;

      case 'REVIEW_UNKNOWN_FIELD':
        // Add the unknown field as an alias placeholder
        overlayType = OverlayType.FIELD_ALIAS;
        config = {
          fieldPath: suggestion.fieldPath,
          alias: `[Review] ${suggestion.fieldPath}`,
          driftSuggestionId: suggestion.id,
        };
        break;

      case 'REVIEW_FIELD_TYPE':
        overlayType = OverlayType.VALIDATION_RULE;
        config = {
          fieldPath: suggestion.fieldPath,
          rule: `type_review:${suggestion.observedIssueType ?? 'unknown'}`,
          driftSuggestionId: suggestion.id,
        };
        break;

      default:
        return null;
    }

    return tx.targetProfileOverlay.create({
      data: {
        targetProfileId: suggestion.targetProfileId,
        overlayType,
        config: config as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  private async assertSuggestionExists(id: string) {
    const exists = await this.prisma.driftSuggestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Drift suggestion ${id} not found`);
  }
}
