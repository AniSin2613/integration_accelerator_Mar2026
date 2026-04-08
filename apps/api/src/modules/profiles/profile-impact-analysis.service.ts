import { Injectable } from '@nestjs/common';

type ImpactLevel = 'NO_IMPACT' | 'INFORMATIONAL' | 'WARNING' | 'BLOCKING';
type ChangeType =
  | 'NEW_FIELD'
  | 'REMOVED_FIELD'
  | 'DEPRECATED_FIELD'
  | 'REQUIREDNESS_CHANGED'
  | 'TYPE_CHANGED'
  | 'PATH_CHANGED';

interface FieldShape {
  path: string;
  dataType?: string;
  required?: boolean;
  deprecated?: boolean;
  businessName?: string | null;
}

interface SchemaLike {
  fields?: FieldShape[];
}

export interface ProfileImpactChange {
  changeType: ChangeType;
  fieldPath: string;
  oldValue?: string;
  newValue?: string;
  impactLevel: ImpactLevel;
}

export interface ProfileImpactAnalysis {
  impactLevel: ImpactLevel;
  changes: ProfileImpactChange[];
  summary: {
    newlyAdded: number;
    removed: number;
    deprecated: number;
    newlyRequired: number;
    typeChanged: number;
    pathChanged: number;
  };
}

@Injectable()
export class ProfileImpactAnalysisService {
  analyze(pinnedSchema: unknown, latestSchema: unknown): ProfileImpactAnalysis {
    const oldFields = this.normalizeFields(pinnedSchema);
    const newFields = this.normalizeFields(latestSchema);

    const oldMap = new Map(oldFields.map((f) => [f.path, f]));
    const newMap = new Map(newFields.map((f) => [f.path, f]));
    const changes: ProfileImpactChange[] = [];

    for (const [path, newField] of newMap.entries()) {
      const oldField = oldMap.get(path);
      if (!oldField) {
        changes.push({
          changeType: 'NEW_FIELD',
          fieldPath: path,
          impactLevel: newField.required ? 'WARNING' : 'INFORMATIONAL',
        });
        continue;
      }

      if ((oldField.required ?? false) !== (newField.required ?? false)) {
        const becameRequired = !(oldField.required ?? false) && Boolean(newField.required);
        changes.push({
          changeType: 'REQUIREDNESS_CHANGED',
          fieldPath: path,
          oldValue: String(Boolean(oldField.required)),
          newValue: String(Boolean(newField.required)),
          impactLevel: becameRequired ? 'BLOCKING' : 'WARNING',
        });
      }

      if ((oldField.dataType ?? '') !== (newField.dataType ?? '')) {
        changes.push({
          changeType: 'TYPE_CHANGED',
          fieldPath: path,
          oldValue: oldField.dataType ?? '',
          newValue: newField.dataType ?? '',
          impactLevel: 'BLOCKING',
        });
      }

      if (!(oldField.deprecated ?? false) && Boolean(newField.deprecated)) {
        changes.push({
          changeType: 'DEPRECATED_FIELD',
          fieldPath: path,
          impactLevel: 'WARNING',
        });
      }
    }

    for (const [path, oldField] of oldMap.entries()) {
      if (!newMap.has(path)) {
        changes.push({
          changeType: 'REMOVED_FIELD',
          fieldPath: path,
          oldValue: oldField.dataType ?? '',
          impactLevel: 'BLOCKING',
        });
      }
    }

    const level = this.pickImpactLevel(changes);
    return {
      impactLevel: level,
      changes,
      summary: {
        newlyAdded: changes.filter((c) => c.changeType === 'NEW_FIELD').length,
        removed: changes.filter((c) => c.changeType === 'REMOVED_FIELD').length,
        deprecated: changes.filter((c) => c.changeType === 'DEPRECATED_FIELD').length,
        newlyRequired: changes.filter((c) => c.changeType === 'REQUIREDNESS_CHANGED' && c.newValue === 'true').length,
        typeChanged: changes.filter((c) => c.changeType === 'TYPE_CHANGED').length,
        pathChanged: changes.filter((c) => c.changeType === 'PATH_CHANGED').length,
      },
    };
  }

  private normalizeFields(schema: unknown): FieldShape[] {
    if (!schema || typeof schema !== 'object') return [];
    const maybe = schema as SchemaLike;
    if (!Array.isArray(maybe.fields)) return [];

    return maybe.fields
      .filter((f): f is FieldShape => Boolean(f && typeof f.path === 'string' && f.path.length > 0))
      .map((f) => ({
        path: f.path,
        dataType: f.dataType,
        required: Boolean(f.required),
        deprecated: Boolean(f.deprecated),
        businessName: f.businessName ?? null,
      }));
  }

  private pickImpactLevel(changes: ProfileImpactChange[]): ImpactLevel {
    if (changes.some((c) => c.impactLevel === 'BLOCKING')) return 'BLOCKING';
    if (changes.some((c) => c.impactLevel === 'WARNING')) return 'WARNING';
    if (changes.some((c) => c.impactLevel === 'INFORMATIONAL')) return 'INFORMATIONAL';
    return 'NO_IMPACT';
  }
}
