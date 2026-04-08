import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverlayType } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Resolves the "effective schema" for a target profile by merging
 * the base SchemaPack fields with all active TargetProfileOverlays.
 *
 * The effective schema is the view that the Mapping Studio and
 * Integration Builder consume — it shows the organisation-specific
 * field names, visibility, validation rules, and defaults rather
 * than the raw schema pack.
 */
@Injectable()
export class EffectiveSchemaResolverService {
  private readonly logger = new Logger(EffectiveSchemaResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the effective schema for a target profile.
   *
   * Algorithm:
   *   1. Load base schema pack fields
   *   2. Layer target profile field customisations (businessName, validation, defaults)
   *   3. Apply active overlays in creation order (oldest → newest)
   *   4. Return the merged field list
   */
  async resolve(profileId: string) {
    const profile = await this.prisma.targetProfile.findUnique({
      where: { id: profileId },
      include: {
        schemaPack: { include: { fields: { orderBy: { path: 'asc' } } } },
        fields: { orderBy: { sortOrder: 'asc' } },
        overlays: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Target profile ${profileId} not found`);
    }

    // Build the base field map from schema pack
    const fieldMap = new Map<string, EffectiveField>();

    for (const baseField of profile.schemaPack.fields) {
      fieldMap.set(baseField.path, {
        path: baseField.path,
        dataType: baseField.dataType,
        required: baseField.required,
        description: baseField.description,
        example: baseField.example,
        businessName: null,
        validationRule: null,
        defaultValue: null,
        visible: true,
        sortOrder: 0,
        source: 'SCHEMA_PACK' as const,
      });
    }

    // Layer profile-level field customisations
    for (const profileField of profile.fields) {
      const existing = fieldMap.get(profileField.path);
      if (existing) {
        existing.businessName = profileField.businessName ?? existing.businessName;
        existing.description = profileField.description ?? existing.description;
        existing.example = profileField.example ?? existing.example;
        existing.required = profileField.required;
        existing.dataType = profileField.dataType;
        existing.validationRule = profileField.validationRule ?? existing.validationRule;
        existing.defaultValue = profileField.defaultValue ?? existing.defaultValue;
        existing.sortOrder = profileField.sortOrder;
        existing.source = 'PROFILE';
      } else {
        // Profile adds a field not in the base schema pack
        fieldMap.set(profileField.path, {
          path: profileField.path,
          dataType: profileField.dataType,
          required: profileField.required,
          description: profileField.description,
          example: profileField.example,
          businessName: profileField.businessName,
          validationRule: profileField.validationRule,
          defaultValue: profileField.defaultValue,
          visible: true,
          sortOrder: profileField.sortOrder,
          source: 'PROFILE',
        });
      }
    }

    // Apply overlays sequentially (oldest → newest)
    for (const overlay of profile.overlays) {
      this.applyOverlay(fieldMap, overlay.overlayType, overlay.config as Record<string, unknown>);
    }

    // Sort and filter hidden fields
    const fields = Array.from(fieldMap.values())
      .filter((f) => f.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.path.localeCompare(b.path));

    // Compute a deterministic hash of the effective schema for drift traceability
    const hashInput = fields
      .map((f) => `${f.path}:${f.dataType}:${f.required}:${f.businessName ?? ''}:${f.validationRule ?? ''}:${f.defaultValue ?? ''}`)
      .join('|');
    const effectiveSchemaHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

    return {
      profileId: profile.id,
      profileName: profile.name,
      system: profile.system,
      object: profile.object,
      isPublished: profile.isPublished,
      currentVersionId: profile.currentVersionId,
      schemaPackId: profile.schemaPackId,
      schemaPackName: profile.schemaPack.name,
      effectiveSchemaHash,
      fieldCount: fields.length,
      fields,
    };
  }

  private applyOverlay(
    fieldMap: Map<string, EffectiveField>,
    overlayType: OverlayType,
    config: Record<string, unknown>,
  ) {
    const fieldPath = config.fieldPath as string | undefined;
    if (!fieldPath) return;

    const field = fieldMap.get(fieldPath);
    if (!field) return;

    switch (overlayType) {
      case OverlayType.FIELD_ALIAS:
        if (typeof config.alias === 'string') {
          field.businessName = config.alias;
        }
        break;

      case OverlayType.VALIDATION_RULE:
        if (typeof config.rule === 'string') {
          field.validationRule = config.rule;
        }
        break;

      case OverlayType.DEFAULT_VALUE:
        if (config.value !== undefined) {
          field.defaultValue = String(config.value);
        }
        break;

      case OverlayType.FIELD_VISIBILITY:
        if (typeof config.visible === 'boolean') {
          field.visible = config.visible;
        }
        break;

      case OverlayType.CUSTOM_TRANSFORM:
        // Custom transforms are stored for downstream consumers;
        // we surface the expression in the effective field.
        if (typeof config.expression === 'string') {
          field.validationRule = `transform:${config.expression}`;
        }
        break;
    }
  }
}

export interface EffectiveField {
  path: string;
  dataType: string;
  required: boolean;
  description: string | null;
  example: string | null;
  businessName: string | null;
  validationRule: string | null;
  defaultValue: string | null;
  visible: boolean;
  sortOrder: number;
  source: 'SCHEMA_PACK' | 'PROFILE';
}
