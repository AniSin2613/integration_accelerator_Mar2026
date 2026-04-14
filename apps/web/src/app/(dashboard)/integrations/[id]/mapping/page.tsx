'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudioHeader } from '@/components/mapping-studio/StudioHeader';
import { MappingHealthStrip } from '@/components/mapping/MappingHealthStrip';
import { CanvasContainer } from '@/components/mapping-studio/CanvasContainer';
import { TransformEditorSheet } from '@/components/mapping-studio/TransformEditorSheet';
import { PreviewPanel } from '@/components/mapping-studio/PreviewPanel';
import { CopilotPanel } from '@/components/mapping-studio/CopilotPanel';
import { api } from '@/lib/api-client';
import { notify } from '@/lib/notify';

interface PreviewPayloadResponse {
  sourcePayload: unknown;
  targetPayload: Record<string, unknown> | null;
  sourceError?: string | null;
  targetError?: string | null;
  previewedAt?: string | null;
  mappingSetId?: string | null;
  mappingVersion?: number | null;
  mappingRuleCount?: number;
}

interface MappingField {
  id: string;
  sourceField: string;
  sourceFields?: string[];
  targetField: string;
  transform: string;
  required?: boolean;
  transformConfig?: string;
  linkedTransformGroup?: string;
  /** Confidence score (0–1) stored only for AI-suggested mappings */
  aiConfidence?: number;
}

interface MappingConfig {
  mappings: MappingField[];
  unmappedSourceFields: string[];
  unmappedTargetFields: string[];
}

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
  /** Enriched fields from effective schema */
  businessName?: string | null;
  validationRule?: string | null;
  defaultValue?: string | null;
  source?: 'SCHEMA_PACK' | 'PROFILE';
}

interface EffectiveSchemaResponse {
  profileId: string;
  profileName: string;
  system: string;
  object: string;
  isPublished: boolean;
  currentVersionId: string | null;
  schemaPackId: string;
  schemaPackName: string;
  effectiveSchemaHash: string;
  fieldCount: number;
  fields: Array<{
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
  }>;
}

interface TargetProfileInfo {
  id: string;
  name: string;
  system: string;
  object: string;
  isPublished: boolean;
}

interface IntegrationDetail {
  id: string;
  name: string;
  version?: string;
  targetProfileId?: string | null;
  targetProfile?: TargetProfileInfo | null;
  pinnedSourceEffectiveProfileVersion?: {
    effectiveSchemaSnapshot?: unknown;
    baselineProfileVersion?: { version?: string | null } | null;
    profileFamily?: { system?: string | null; interfaceName?: string | null; object?: string | null } | null;
  } | null;
  pinnedTargetEffectiveProfileVersion?: {
    baselineProfileVersion?: { version?: string | null } | null;
    profileFamily?: { system?: string | null; interfaceName?: string | null; object?: string | null } | null;
  } | null;
  sourceSchema?: Record<string, unknown>;
  targetSchema?: Record<string, unknown>;
  mapping?: MappingConfig;
  sourceSamplePayload?: Record<string, unknown>;
  targetSamplePayload?: Record<string, unknown>;
  sourcePayload?: Record<string, unknown>;
  targetPayload?: Record<string, unknown>;
  sampleSourcePayload?: Record<string, unknown>;
  sampleTargetPayload?: Record<string, unknown>;
  templateVersion?: {
    templateDef?: {
      name?: string | null;
      sourceSystem?: string | null;
      targetSystem?: string | null;
    } | null;
    workflowStructure?: {
      boxes?: Array<{ config?: Record<string, unknown> }>;
    };
    schemaPacks?: Array<{
      role?: string;
      schemaPack?: {
        fields?: Array<{
          path: string;
          dataType?: string;
          required?: boolean;
          description?: string | null;
          example?: string | null;
        }>;
      };
    }>;
  };
  targetState?: {
    targets?: Array<{
      params?: Array<{ key?: string; value?: string }>;
      connectionFamily?: string;
    }>;
  } | null;
}

interface ApiMappingRule {
  id?: string;
  sourceField?: string;
  targetField?: string;
  mappingType?: string;
  transformConfig?: unknown;
  required?: boolean;
}

interface ApiMappingSet {
  id?: string;
  version?: number;
  rules?: ApiMappingRule[];
}

function inferGroup(path: string): string {
  const normalized = path.replace(/\[\d+\]/g, '').replace(/_/g, '.');
  const chunks = normalized.split('.').filter(Boolean);
  if (chunks.length <= 1) return 'General';
  return chunks.slice(0, -1).join(' / ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferType(value: unknown): StudioSchemaField['type'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';
  if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  return 'string';
}

function flattenPayloadFields(value: unknown, prefix: string, output: StudioSchemaField[], side: 'source' | 'target') {
  if (!value || typeof value !== 'object') return;

  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      flattenPayloadFields(nested, path, output, side);
      return;
    }

    output.push({
      path,
      label: path,
      group: inferGroup(path),
      type: inferType(nested),
      required: side === 'target' ? false : undefined,
      sampleValue: nested == null ? '' : String(nested),
    });
  });
}

function uniqueByPath(fields: StudioSchemaField[]): StudioSchemaField[] {
  const map = new Map<string, StudioSchemaField>();
  fields.forEach((field) => {
    const existing = map.get(field.path);
    if (!existing) {
      map.set(field.path, field);
      return;
    }
    map.set(field.path, {
      ...existing,
      required: Boolean(existing.required || field.required),
      helperText: existing.helperText || field.helperText,
      sampleValue: existing.sampleValue || field.sampleValue,
      type: existing.type || field.type,
    });
  });
  return Array.from(map.values());
}

function buildSchemaFromRules(rules: ApiMappingRule[], side: 'source' | 'target'): StudioSchemaField[] {
  const fields = rules
    .map((rule) => (side === 'source' ? rule.sourceField : rule.targetField))
    .filter((path): path is string => Boolean(path))
    .map((path) => ({
      path,
      label: path,
      group: inferGroup(path),
      type: 'string' as const,
      required: side === 'target' ? Boolean(rules.find((rule) => rule.targetField === path)?.required) : undefined,
    }));
  return uniqueByPath(fields);
}

function formatTransformConfigForEditor(raw: unknown): string | undefined {
  const unwrapNestedText = (value: unknown, preferredKeys: string[] = ['expression', 'rule', 'filter', 'value', 'constant'], depth = 0): string | undefined => {
    if (depth > 12 || value == null) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          return unwrapNestedText(JSON.parse(trimmed), preferredKeys, depth + 1) ?? trimmed;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    for (const key of preferredKeys) {
      const unwrapped = unwrapNestedText(record[key], preferredKeys, depth + 1);
      if (unwrapped) return unwrapped;
    }
    return undefined;
  };

  if (raw == null) return undefined;

  let cfg: unknown = raw;
  if (typeof cfg === 'string') {
    const trimmed = cfg.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        cfg = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return undefined;
  const record = cfg as Record<string, unknown>;
  const type = String(record.type ?? '').toLowerCase();

  if (type === 'constant') return unwrapNestedText(record.value, ['value', 'constant']) ?? String(record.value ?? '');
  if (type === 'conditional' || type === 'formula' || type === 'filter') return unwrapNestedText(record, ['expression', 'rule', 'filter']) ?? '';
  if (type === 'dateformat') return `${String(record.fromFormat ?? 'YYYY-MM-DD')}|${String(record.toFormat ?? 'YYYY-MM-DD')}`;
  if (type === 'concat') return String(record.separator ?? ' ');
  if (type === 'lookup') {
    if (record.table && typeof record.table === 'object') return JSON.stringify(record.table);
    return unwrapNestedText(record, ['expression']) ?? '';
  }

  return JSON.stringify(record);
}

function normalizeMappingConfig(raw: unknown): MappingConfig {
  if (raw && typeof raw === 'object' && Array.isArray((raw as MappingConfig).mappings)) {
    const cfg = raw as MappingConfig;
    return {
      mappings: cfg.mappings.map((m, idx) => ({
        id: m.id || `m-${idx}`,
        sourceField: m.sourceField,
        targetField: m.targetField,
        transform: m.transform || 'direct',
        required: m.required,
        transformConfig: m.transformConfig,
      })),
      unmappedSourceFields: cfg.unmappedSourceFields || [],
      unmappedTargetFields: cfg.unmappedTargetFields || [],
    };
  }

  // Single mapping set from /mappings/latest → wrap as array so the block below handles it
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray((raw as ApiMappingSet).rules)) {
    return normalizeMappingConfig([raw as ApiMappingSet]);
  }

  if (Array.isArray(raw)) {
    const sets = raw as ApiMappingSet[];
    const rules = sets.flatMap((set) => (Array.isArray(set.rules) ? set.rules : []));
    const mappings: MappingField[] = rules
      .filter((r) => r.sourceField && r.targetField)
      .map((rule, idx) => ({
        id: rule.id || `m-${idx}`,
        sourceField: rule.sourceField || '',
        targetField: rule.targetField || '',
        transform: (() => {
          const cfg = rule.transformConfig;
          if (cfg && typeof cfg === 'object' && !Array.isArray(cfg) && typeof (cfg as Record<string, unknown>).type === 'string') {
            return String((cfg as Record<string, unknown>).type);
          }
          const mt = String(rule.mappingType ?? 'DIRECT').toUpperCase();
          if (mt === 'CONSTANT') return 'constant';
          if (mt === 'LOOKUP') return 'lookup';
          if (mt === 'CONDITIONAL') return 'conditional';
          if (mt === 'DERIVED') return 'formula';
          return 'direct';
        })(),
        required: Boolean(rule.required),
        transformConfig: formatTransformConfigForEditor(rule.transformConfig),
      }));
    return { mappings, unmappedSourceFields: [], unmappedTargetFields: [] };
  }

  return { mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] };
}

function toApiMappingType(transform: string): 'DIRECT' | 'CONSTANT' | 'DERIVED' | 'LOOKUP' | 'CONDITIONAL' {
  const normalized = String(transform ?? '').trim().toUpperCase();
  if (normalized === 'DIRECT') return 'DIRECT';
  if (normalized === 'CONSTANT') return 'CONSTANT';
  if (normalized === 'LOOKUP') return 'LOOKUP';
  if (normalized === 'CONDITIONAL') return 'CONDITIONAL';
  if (normalized === 'DERIVED' || normalized === 'FORMULA' || normalized === 'CONCAT') return 'DERIVED';
  return 'DIRECT';
}

function parseTransformConfig(transform: string, raw?: string, sourceFields?: string[]): Record<string, unknown> | undefined {
  const kind = String(transform ?? 'direct').trim().toLowerCase();
  const trimmed = raw?.trim() ?? '';

  if (kind === 'direct') return undefined;

  if (kind === 'uppercase' || kind === 'lowercase' || kind === 'trim') {
    return { type: kind };
  }

  if (kind === 'constant') {
    return { type: 'constant', value: trimmed };
  }

  if (kind === 'lookup') {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { type: 'lookup', table: parsed as Record<string, unknown> };
        }
      } catch {
        // Fall through to expression fallback.
      }
    }
    return { type: 'lookup', expression: trimmed };
  }

  if (kind === 'dateformat') {
    const [fromFormatRaw, toFormatRaw] = trimmed.split('|');
    const fromFormat = fromFormatRaw?.trim() || 'YYYY-MM-DD';
    const toFormat = toFormatRaw?.trim() || 'YYYY-MM-DD';
    return { type: 'dateFormat', fromFormat, toFormat };
  }

  if (kind === 'concat') {
    return {
      type: 'concat',
      separator: trimmed || ' ',
      sourceFields: Array.isArray(sourceFields) && sourceFields.length > 0 ? sourceFields : undefined,
    };
  }

  if (kind === 'formula' || kind === 'conditional') {
    return {
      type: kind,
      expression: trimmed,
      sourceFields: Array.isArray(sourceFields) && sourceFields.length > 0 ? sourceFields : undefined,
    };
  }

  return { type: kind, expression: trimmed };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapDataType(dt: string): StudioSchemaField['type'] {
  const lower = dt.toLowerCase();
  if (lower.includes('int') || lower.includes('decimal') || lower.includes('float') || lower === 'number') return 'number';
  if (lower.includes('date') || lower.includes('time')) return 'date';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'array' || lower.includes('list')) return 'array';
  if (lower === 'object' || lower === 'json') return 'object';
  return 'string';
}

function parseEffectiveSchemaSnapshotToFields(snapshot: unknown): StudioSchemaField[] {
  const out: StudioSchemaField[] = [];

  if (!snapshot || typeof snapshot !== 'object') return out;

  const asRecord = snapshot as Record<string, unknown>;
  const fields = Array.isArray(asRecord.fields) ? asRecord.fields : [];

  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const path = typeof row.path === 'string' ? row.path : '';
    if (!path) continue;
    out.push({
      path,
      label: typeof row.businessName === 'string' && row.businessName.trim().length > 0 ? row.businessName : path,
      group: inferGroup(path),
      type: typeof row.dataType === 'string' ? mapDataType(row.dataType) : 'string',
      required: Boolean(row.required),
      helperText: typeof row.description === 'string' ? row.description : undefined,
      sampleValue: typeof row.example === 'string' ? row.example : undefined,
      businessName: typeof row.businessName === 'string' ? row.businessName : null,
      validationRule: typeof row.validationRule === 'string' ? row.validationRule : null,
      defaultValue: typeof row.defaultValue === 'string' ? row.defaultValue : null,
      source: (row.source === 'PROFILE' ? 'PROFILE' : 'SCHEMA_PACK') as 'SCHEMA_PACK' | 'PROFILE',
    });
  }

  return out;
}

function parseTemplateSourceSchemaPackFields(integration: IntegrationDetail): StudioSchemaField[] {
  const bindings = integration.templateVersion?.schemaPacks;
  if (!Array.isArray(bindings)) return [];

  const sourceBinding = bindings.find((b) => String(b.role ?? '').toUpperCase() === 'SOURCE');
  const fields = sourceBinding?.schemaPack?.fields;
  if (!Array.isArray(fields)) return [];

  return fields
    .filter((f) => typeof f.path === 'string' && f.path.trim().length > 0)
    .map((f) => ({
      path: f.path,
      label: f.path,
      group: inferGroup(f.path),
      type: mapDataType(String(f.dataType ?? 'string')),
      required: Boolean(f.required),
      helperText: typeof f.description === 'string' ? f.description : undefined,
      sampleValue: typeof f.example === 'string' ? f.example : undefined,
      source: 'SCHEMA_PACK' as const,
    }));
}

function isJsonOrXmlDemoTarget(integration: IntegrationDetail): boolean {
  const first = integration.targetState?.targets?.[0];
  const params = Array.isArray(first?.params) ? first?.params : [];
  const targetTypeParam = params.find((p) => String(p?.key ?? '').toLowerCase() === 'demotargettype');
  const targetType = String(targetTypeParam?.value ?? '').toUpperCase();
  if (targetType === 'JSON' || targetType === 'XML') return true;
  const family = String(first?.connectionFamily ?? '').toUpperCase();
  return family.includes('DEMO_JSON') || family.includes('DEMO_XML');
}

function cloneSourceAsTargetSchema(source: StudioSchemaField[]): StudioSchemaField[] {
  return source.map((f) => ({
    ...f,
    required: Boolean(f.required),
  }));
}

function similarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((token) => {
    if (tb.has(token)) overlap += 1;
  });
  return overlap / Math.max(ta.size, tb.size);
}

function appendIssue(issues: string[], message: string) {
  if (!issues.includes(message)) {
    issues.push(message);
  }
}

export default function MappingStudioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id: integrationId } = params;
  
  const [integration, setIntegration] = useState<IntegrationDetail | null>(null);
  const [sourceSchema, setSourceSchema] = useState<StudioSchemaField[]>([]);
  const [targetSchema, setTargetSchema] = useState<StudioSchemaField[]>([]);
  const [mappingConfig, setMappingConfig] = useState<MappingConfig>({ mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] });
  const [savedMappingConfig, setSavedMappingConfig] = useState<MappingConfig>({ mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] });
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [transformEditorOpen, setTransformEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayloads, setPreviewPayloads] = useState<PreviewPayloadResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRequestError, setPreviewRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [targetProfileInfo, setTargetProfileInfo] = useState<TargetProfileInfo | null>(null);
  const [effectiveSchemaName, setEffectiveSchemaName] = useState<string | null>(null);
  const [schemaIssues, setSchemaIssues] = useState<string[]>([]);

  // Integration Copilot — AI suggestion tracking
  // Maps mappingId -> 'UNREVIEWED' | 'REVIEWED'
  const [aiReviewMap, setAiReviewMap] = useState<Map<string, 'UNREVIEWED' | 'REVIEWED'>>(new Map());
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Load integration and schema data
  useEffect(() => {
    const loadData = async () => {
      try {
        const integResult = await api.get<IntegrationDetail>(`/integrations/${integrationId}`);
        setIntegration(integResult);
        setTargetProfileInfo(integResult.targetProfile ?? null);
        setEffectiveSchemaName(null);
        setSchemaIssues([]);

        const issues: string[] = [];

        // Load the latest mapping set only — using /mappings (all sets) would accumulate
        // rules from every historical version and create duplicates on each re-open.
        let mappingRaw: unknown = null;
        try {
          mappingRaw = await api.get<unknown>(`/integrations/${integrationId}/mappings/latest`);
        } catch {
          // No mappings saved yet — start with an empty config.
        }
        const normalizedConfig = normalizeMappingConfig(mappingRaw);

        // Build schema candidates from multiple sources
        const inferredSource: StudioSchemaField[] = [];
        const inferredTarget: StudioSchemaField[] = [];

        // Infer schema from the already-normalized mappings (avoids double-parsing the response)
        inferredSource.push(...buildSchemaFromRules(
          normalizedConfig.mappings.map((m) => ({ sourceField: m.sourceField, targetField: m.targetField, required: m.required })),
          'source',
        ));
        inferredTarget.push(...buildSchemaFromRules(
          normalizedConfig.mappings.map((m) => ({ sourceField: m.sourceField, targetField: m.targetField, required: m.required })),
          'target',
        ));

        if (integResult.sourceSchema) flattenPayloadFields(integResult.sourceSchema, '', inferredSource, 'source');
        if (integResult.targetSchema) flattenPayloadFields(integResult.targetSchema, '', inferredTarget, 'target');

        // Source effective schema (preferred when present)
        inferredSource.push(
          ...parseEffectiveSchemaSnapshotToFields(
            integResult.pinnedSourceEffectiveProfileVersion?.effectiveSchemaSnapshot,
          ),
        );

        // Template source schema pack (fallback when source effective profile is not pinned)
        inferredSource.push(...parseTemplateSourceSchemaPackFields(integResult));

        const sourcePayload = integResult.sourceSamplePayload ?? integResult.sourcePayload ?? integResult.sampleSourcePayload;
        const targetPayload = integResult.targetSamplePayload ?? integResult.targetPayload ?? integResult.sampleTargetPayload;
        flattenPayloadFields(sourcePayload, '', inferredSource, 'source');
        flattenPayloadFields(targetPayload, '', inferredTarget, 'target');

        // Try live source/target preview payloads so source fields reflect configured source endpoint data.
        let initialPreviewPayloads: PreviewPayloadResponse | null = null;
        try {
          initialPreviewPayloads = await api.get<PreviewPayloadResponse>(`/integrations/${integrationId}/preview-payloads`);
          flattenPayloadFields(initialPreviewPayloads.sourcePayload, '', inferredSource, 'source');
          flattenPayloadFields(initialPreviewPayloads.targetPayload, '', inferredTarget, 'target');
        } catch (error) {
          appendIssue(
            issues,
            error instanceof Error
              ? `Preview payload is unavailable: ${error.message}`
              : 'Preview payload is unavailable.',
          );
          initialPreviewPayloads = null;
        }

        const boxes = integResult.templateVersion?.workflowStructure?.boxes;
        if (Array.isArray(boxes)) {
          boxes.forEach((box) => {
            flattenPayloadFields(box.config?.sourceSchema, '', inferredSource, 'source');
            flattenPayloadFields(box.config?.targetSchema, '', inferredTarget, 'target');
          });
        }

        const nextSource = uniqueByPath(inferredSource);
        const nextTarget = uniqueByPath(inferredTarget);

        const finalSource = nextSource;
        let finalTarget = nextTarget;
        let targetEffectiveSchemaFailed = false;

        // If the integration has a target profile, load its effective schema
        if (integResult.targetProfileId) {
          try {
            const eff = await api.get<EffectiveSchemaResponse>(`/target-profiles/${integResult.targetProfileId}/effective-schema`);

            if (isJsonOrXmlDemoTarget(integResult)) {
              // For JSON/XML demo targets the target schema mirrors the source,
              // but requiredness is overlaid from the target profile.
              const profileRequiredPaths = new Set(
                eff.fields.filter((f) => f.required).map((f) => f.path),
              );
              finalTarget = finalSource.map((f) => ({
                ...f,
                required: profileRequiredPaths.has(f.path),
              }));
            } else {
              finalTarget = eff.fields.map((f) => ({
                path: f.path,
                label: f.businessName || f.path,
                group: inferGroup(f.path),
                type: mapDataType(f.dataType),
                required: f.required,
                helperText: f.description || undefined,
                sampleValue: f.example || undefined,
                businessName: f.businessName,
                validationRule: f.validationRule,
                defaultValue: f.defaultValue,
                source: f.source,
              }));
            }
            setEffectiveSchemaName(eff.schemaPackName);
          } catch (err) {
            targetEffectiveSchemaFailed = true;
            console.error('Failed to load effective schema, using inferred target fields', err);
            appendIssue(
              issues,
              err instanceof Error
                ? `Target schema fetch failed: ${err.message}`
                : 'Target schema fetch failed.',
            );
          }
        }

        // For JSON/XML demo targets without a target profile, use source schema as target schema.
        if (!integResult.targetProfileId && isJsonOrXmlDemoTarget(integResult)) {
          finalTarget = cloneSourceAsTargetSchema(finalSource);
        }
        if (finalSource.length === 0) {
          if (!integResult.pinnedSourceEffectiveProfileVersion?.effectiveSchemaSnapshot) {
            appendIssue(issues, 'Source profile is not pinned, or its effective schema is not available yet.');
          }
          if (!sourcePayload && !integResult.sourceSchema && !initialPreviewPayloads?.sourcePayload) {
            appendIssue(issues, 'No source payload or source schema is available yet.');
          }
        }

        if (finalTarget.length === 0) {
          if (!integResult.targetProfileId && !isJsonOrXmlDemoTarget(integResult)) {
            appendIssue(issues, 'Target profile is missing.');
          }
          if (isJsonOrXmlDemoTarget(integResult) && finalSource.length === 0) {
            appendIssue(issues, 'Target output mirrors the source, but no source schema is available yet.');
          }
          if (!targetEffectiveSchemaFailed && !targetPayload && !integResult.targetSchema && !initialPreviewPayloads?.targetPayload && !integResult.targetProfileId) {
            appendIssue(issues, 'No target payload or target schema is available yet.');
          }
        }

        if (issues.length === 0 && (finalSource.length === 0 || finalTarget.length === 0)) {
          appendIssue(issues, 'Schema could not be derived from the current integration configuration.');
        }

        const mappedSourceSet = new Set(normalizedConfig.mappings.map((m) => m.sourceField));
        const mappedTargetSet = new Set(normalizedConfig.mappings.map((m) => m.targetField));

        setSourceSchema(finalSource);
        setTargetSchema(finalTarget);
        setSchemaIssues(issues);
        const hydratedMappingConfig = {
          ...normalizedConfig,
          unmappedSourceFields: finalSource.filter((f) => !mappedSourceSet.has(f.path)).map((f) => f.path),
          unmappedTargetFields: finalTarget.filter((f) => f.required && !mappedTargetSet.has(f.path)).map((f) => f.path),
        };
        setMappingConfig(hydratedMappingConfig);
        setSavedMappingConfig(hydratedMappingConfig);
        setPreviewPayloads(initialPreviewPayloads);
      } catch (error) {
        console.error('Failed to load mapping studio data:', error);
        setSourceSchema([]);
        setTargetSchema([]);
        setMappingConfig({ mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] });
        setSavedMappingConfig({ mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] });
        setSchemaIssues([
          error instanceof Error
            ? `Schema fetch failed: ${error.message}`
            : 'Schema fetch failed.',
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [integrationId]);

  const loadPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setPreviewRequestError(null);
      const result = await api.get<PreviewPayloadResponse>(`/integrations/${integrationId}/preview-payloads`);
      setPreviewPayloads(result);
    } catch (error) {
      setPreviewPayloads(null);
      setPreviewRequestError(error instanceof Error ? error.message : 'Failed to load preview payloads');
    } finally {
      setPreviewLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    if (!previewOpen) return;
    void loadPreview();
  }, [previewOpen, loadPreview]);

  useEffect(() => {
    if (!previewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewOpen]);

  const handleSaveMapping = async () => {
    try {
      const rules = mappingConfig.mappings
        .filter((m) => m.sourceField?.trim() && m.targetField?.trim())
        .map((m) => ({
          sourceField: m.sourceField.trim(),
          targetField: m.targetField.trim(),
          mappingType: toApiMappingType(m.transform),
          transformConfig: parseTransformConfig(m.transform, m.transformConfig, m.sourceFields),
        }));

      await api.post(`/integrations/${integrationId}/mappings`, { rules });
      const refreshedMappings = normalizeMappingConfig(await api.get<unknown>(`/integrations/${integrationId}/mappings/latest`));
      const mappedTargetSet = new Set(refreshedMappings.mappings.map((m) => m.targetField));
      const mappedSourceSet = new Set(refreshedMappings.mappings.map((m) => m.sourceField));
      const nextSavedConfig = {
        ...refreshedMappings,
        unmappedSourceFields: sourceSchema.filter((f) => !mappedSourceSet.has(f.path)).map((f) => f.path),
        unmappedTargetFields: targetSchema.filter((f) => f.required && !mappedTargetSet.has(f.path)).map((f) => f.path),
      };
      setSavedMappingConfig(nextSavedConfig);
      if (previewOpen) {
        await loadPreview();
      }
      setUnsavedChanges(false);
      notify.success('Mappings saved successfully.');
    } catch (error) {
      console.error('Failed to save mapping:', error);
      notify.error('Failed to save mappings. Please check API logs and try again.');
    }
  };

  const handleBackToBuilder = () => {
    if (unsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to leave?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleValidate = () => {
    const issues: string[] = [];

    // Guard: no mappings at all
    if (mappingConfig.mappings.length === 0) {
      issues.push('No mappings defined. Add at least one mapping before validating.');
    }

    const mappedTargets = new Set(mappingConfig.mappings.map((m) => m.targetField));

    targetSchema
      .filter((field) => field.required)
      .forEach((field) => {
        if (!mappedTargets.has(field.path)) {
          issues.push(`Required target field unmapped: ${field.path}`);
        }
      });

    const targetCounts = mappingConfig.mappings.reduce<Record<string, number>>((acc, mapping) => {
      acc[mapping.targetField] = (acc[mapping.targetField] ?? 0) + 1;
      return acc;
    }, {});

    Object.entries(targetCounts).forEach(([path, count]) => {
      if (count > 1) issues.push(`Duplicate target mapping: ${path}`);
    });

    mappingConfig.mappings.forEach((mapping) => {
      if ((mapping.transform === 'lookup' || mapping.transform === 'formula') && !mapping.transformConfig?.trim()) {
        issues.push(`Missing transform config for ${mapping.targetField}`);
      }
    });

    setValidationMessages(issues);
    if (issues.length === 0) {
      notify.success('Mapping-local validation passed. No blockers found.');
    } else {
      notify.warning(`Mapping-local validation found ${issues.length} issue(s).`);
    }
  };

  const handleSuggest = () => {
    const mappedTargets = new Set(mappingConfig.mappings.map((m) => m.targetField));
    const requiredTargets = targetSchema.filter((field) => field.required);
    const suggestions: Array<{ sourcePath: string; targetPath: string; score: number }> = [];

    // Integration Copilot: only suggest for unmapped REQUIRED target fields
    requiredTargets.forEach((target) => {
      if (mappedTargets.has(target.path)) return;

      let bestSourcePath = '';
      let bestScore = 0;
      sourceSchema.forEach((source) => {
        const score = similarity(source.path, target.path);
        if (score > bestScore) {
          bestScore = score;
          bestSourcePath = source.path;
        }
      });

      // Threshold: 0.35 for local fuzzy fallback (real Copilot API will use configurable threshold)
      if (bestSourcePath && bestScore >= 0.35) {
        suggestions.push({ sourcePath: bestSourcePath, targetPath: target.path, score: bestScore });
      }
    });

    if (suggestions.length === 0) {
      const allRequiredAlreadyMapped = requiredTargets.every((f) => mappedTargets.has(f.path));
      if (allRequiredAlreadyMapped && requiredTargets.length > 0) {
        notify.info('Integration Copilot: All required target fields already have mappings. Use the Ask AI panel to get suggestions for optional fields.');
      } else {
        notify.info(
          'Integration Copilot: No confident suggestions found for the remaining unmapped required fields. Try mapping them manually or use Ask AI to describe the relationship.'
        );
      }
      return;
    }

    // Confidence scores are shown on each mapping bar — keep the dialog simple.
    notify.info(
      `Integration Copilot found ${suggestions.length} suggestion(s) for unmapped required fields. Applying and marking for review.`
    );

    // Compute new rows synchronously from the current snapshot.
    // window.confirm is a blocking call — the user cannot trigger a second "Suggest Required"
    // while the dialog is open, so the snapshot captured at the top of this function is
    // guaranteed to be current when execution resumes here.  Using a functional updater in
    // setMappingConfig is therefore unnecessary and can cause badge/canvas desync in React 18
    // concurrent mode (the updater's `prev` may differ from the snapshot used to build
    // `suggestions`, making its no-op guard trigger while setAiReviewMap still runs).
    const ts = Date.now();
    const toAdd: MappingField[] = suggestions
      .filter((s) => !mappedTargets.has(s.targetPath)) // guard against stale snapshot edge-case
      .map((s, idx) => ({
        id: `m-suggest-${ts}-${idx}`,
        sourceField: s.sourcePath,
        targetField: s.targetPath,
        transform: 'direct',
        required: Boolean(requiredTargets.find((f) => f.path === s.targetPath)),
        aiConfidence: s.score,
      }));

    if (toAdd.length === 0) return;

    const updatedMappings = [...mappingConfig.mappings, ...toAdd];
    const mappedTargetSet = new Set(updatedMappings.map((m) => m.targetField));
    const mappedSourceSet = new Set(updatedMappings.map((m) => m.sourceField));

    setMappingConfig({
      mappings: updatedMappings,
      unmappedSourceFields: sourceSchema.filter((f) => !mappedSourceSet.has(f.path)).map((f) => f.path),
      unmappedTargetFields: targetSchema.filter((f) => f.required && !mappedTargetSet.has(f.path)).map((f) => f.path),
    });

    // Only mark the IDs that were actually added so the badge stays in sync with the canvas.
    setAiReviewMap((prev) => {
      const next = new Map(prev);
      toAdd.forEach((m) => next.set(m.id, 'UNREVIEWED'));
      return next;
    });

    setUnsavedChanges(true);
  };

  // Integration Copilot — open the conversational panel
  const handleAskAI = () => setCopilotOpen(true);

  // Integration Copilot — apply a mapping suggested by the panel
  const handleCopilotApplyMapping = (
    sourceField: string,
    targetField: string,
    withTransform?: string | null,
  ) => {
    if (mappingConfig.mappings.find((m) => m.targetField === targetField)) return;
    const newId = `m-copilot-${Date.now()}`;
    const newMapping = {
      id: newId,
      sourceField,
      targetField,
      transform: withTransform ? 'expression' : 'direct',
      transformConfig: withTransform ? JSON.stringify({ expression: withTransform }) : undefined,
      required: Boolean(targetSchema.find((f) => f.path === targetField)?.required),
    };
    const updated = [...mappingConfig.mappings, newMapping];
    const mappedSourceSet = new Set(updated.map((m) => m.sourceField));
    const mappedTargetSet = new Set(updated.map((m) => m.targetField));
    setMappingConfig({
      mappings: updated,
      unmappedSourceFields: sourceSchema.filter((f) => !mappedSourceSet.has(f.path)).map((f) => f.path),
      unmappedTargetFields: targetSchema.filter((f) => f.required && !mappedTargetSet.has(f.path)).map((f) => f.path),
    });
    setAiReviewMap((prev) => { const next = new Map(prev); next.set(newId, 'UNREVIEWED'); return next; });
    setUnsavedChanges(true);
  };

  // Mark an AI-suggested mapping as reviewed when user opens/edits it
  const markAiReviewed = (mappingId: string) => {
    setAiReviewMap((prev) => {
      if (!prev.has(mappingId)) return prev;
      const next = new Map(prev);
      next.set(mappingId, 'REVIEWED');
      return next;
    });
  };

  // Count distinct required target fields that have at least one mapping.
  // Using raw mapping count would produce values larger than requiredTotal when
  // duplicate mappings exist (e.g. 126 mappings → 126 > 18 required → negative blockers).
  const requiredMapped = new Set(
    mappingConfig.mappings
      .filter((m) => targetSchema.find((f) => f.path === m.targetField)?.required)
      .map((m) => m.targetField)
  ).size;

  const requiredTotal = targetSchema.filter(f => f.required).length;
  const blockers = Math.max(0, requiredTotal - requiredMapped);
  const nextUnmapped = targetSchema.filter(f => f.required && !mappingConfig.mappings.find(m => m.targetField === f.path)).map(f => f.label);
  const isJsonXmlTarget = integration ? isJsonOrXmlDemoTarget(integration) : false;
  const schemaReady = sourceSchema.length > 0 && targetSchema.length > 0;

  // Source coverage: how many distinct source fields are used in active mappings
  const mappedSourcePaths = new Set(mappingConfig.mappings.map((m) => m.sourceField));
  const sourceUsed = sourceSchema.filter((f) => mappedSourcePaths.has(f.path)).length;
  const sourceTotal = sourceSchema.length;

  // Integration Copilot: count unreviewed AI suggestions
  const unreviewedAiCount = Array.from(aiReviewMap.values()).filter((v) => v === 'UNREVIEWED').length;

  // Source label: prefer pinned profile family, fall back to template source system
  const sourceProfileLabel = (() => {
    const pf = integration?.pinnedSourceEffectiveProfileVersion?.profileFamily;
    if (pf?.system) {
      const iface = pf.interfaceName ?? pf.object ?? '';
      const ver = integration?.pinnedSourceEffectiveProfileVersion?.baselineProfileVersion?.version;
      return `${pf.system}${iface ? ` / ${iface}` : ''}${ver ? ` v${ver}` : ''}`;
    }
    const tmplSource = integration?.templateVersion?.templateDef?.sourceSystem;
    if (tmplSource) return tmplSource;
    return 'Source';
  })();

  // Target label: JSON/XML gets a friendly label; real profile shows system/version
  const demoTargetTypeValue = integration?.targetState?.targets?.[0]?.params
    ?.find((p: { key?: string }) => String(p?.key ?? '').toLowerCase() === 'demotargettype')?.value ?? 'JSON';
  const targetProfileLabel = isJsonXmlTarget
    ? `${demoTargetTypeValue} Output (mirrors source)`
    : (() => {
        const pf = integration?.pinnedTargetEffectiveProfileVersion?.profileFamily;
        if (pf?.system) {
          const iface = pf.interfaceName ?? pf.object ?? '';
          const ver = integration?.pinnedTargetEffectiveProfileVersion?.baselineProfileVersion?.version;
          return `${pf.system}${iface ? ` / ${iface}` : ''}${ver ? ` v${ver}` : ''}`;
        }
        if (targetProfileInfo) return `${targetProfileInfo.system} / ${targetProfileInfo.object}`;
        const tmplTarget = integration?.templateVersion?.templateDef?.targetSystem;
        if (tmplTarget) return tmplTarget;
        return 'Target';
      })();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-text-muted/40 animate-pulse">conversion_path</span>
          <p className="text-sm text-text-muted">Loading Mapping Studio…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background-light">
      {/* Header */}
      <StudioHeader
        integrationName={integration?.name || 'Integration'}
        version={integration?.version || ''}
        sourceObject={sourceProfileLabel}
        targetObject={targetProfileLabel}
        actionsDisabled={!schemaReady}
        onBack={handleBackToBuilder}
        onSave={handleSaveMapping}
        onValidate={handleValidate}
        onPreview={() => setPreviewOpen(!previewOpen)}
        onSuggest={handleSuggest}
        onAskAI={handleAskAI}
        unreviewedAiCount={unreviewedAiCount}
        unsavedChanges={unsavedChanges}
      />

      {schemaReady ? (
        <>
          {/* Status Strip */}
          <MappingHealthStrip
            requiredMapped={requiredMapped}
            requiredTotal={requiredTotal}
            blockers={blockers}
            nextTargets={nextUnmapped}
            sourceUsed={sourceUsed}
            sourceTotal={sourceTotal}
            unreviewedAiCount={unreviewedAiCount}
          />

          {/* Main Canvas Area */}
          <CanvasContainer
            sourceFields={sourceSchema}
            targetFields={targetSchema}
            mappings={mappingConfig.mappings}
            selectedMappingId={selectedMappingId}
            onMappingSelect={setSelectedMappingId}
            onMappingChange={(updated) => {
              const mappedTargetSet = new Set(updated.map((m) => m.targetField));
              const mappedSourceSet = new Set(updated.map((m) => m.sourceField));
              setMappingConfig({
                mappings: updated,
                unmappedSourceFields: sourceSchema.filter((f) => !mappedSourceSet.has(f.path)).map((f) => f.path),
                unmappedTargetFields: targetSchema.filter((f) => f.required && !mappedTargetSet.has(f.path)).map((f) => f.path),
              });
              setUnsavedChanges(true);
            }}
            onTransformEdit={(mappingId) => {
              setSelectedMappingId(mappingId);
              setTransformEditorOpen(true);
            }}
            targetProfileInfo={targetProfileInfo}
          />
        </>
      ) : (
        <div className="flex-1 overflow-y-auto bg-background-light px-6 py-6">
          <section className="mx-auto max-w-5xl rounded-2xl border border-border-soft bg-surface shadow-soft">
            <div className="border-b border-border-soft px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-600">
                  <span className="material-symbols-outlined text-[22px]">schema</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-main">No schema available yet</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    The mapping studio is waiting for real source and target schema data. It will not substitute dummy fields for this integration.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
              <div className="rounded-xl border border-border-soft bg-background-light/60 p-4">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${sourceSchema.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {sourceSchema.length > 0 ? 'check_circle' : 'warning'}
                  </span>
                  <h3 className="text-sm font-semibold text-text-main">Source schema</h3>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  {sourceSchema.length > 0
                    ? `${sourceSchema.length} real source fields loaded.`
                    : 'No real source schema could be derived yet.'}
                </p>
              </div>

              <div className="rounded-xl border border-border-soft bg-background-light/60 p-4">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${targetSchema.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {targetSchema.length > 0 ? 'check_circle' : 'warning'}
                  </span>
                  <h3 className="text-sm font-semibold text-text-main">Target schema</h3>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  {targetSchema.length > 0
                    ? `${targetSchema.length} real target fields loaded${effectiveSchemaName ? ` from ${effectiveSchemaName}` : ''}.`
                    : 'No real target schema could be derived yet.'}
                </p>
              </div>
            </div>

            <div className="border-t border-border-soft px-6 py-5">
              <h3 className="text-sm font-semibold text-text-main">Why the studio is blocked</h3>
              <ul className="mt-3 space-y-2">
                {schemaIssues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="material-symbols-outlined mt-0.5 text-[16px] text-amber-600">priority_high</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* Floating Preview Overlay */}
      {previewOpen && schemaReady && (
        <PreviewPanel
          mappings={savedMappingConfig.mappings}
          sourceSchema={sourceSchema}
          targetSchema={targetSchema}
          sourcePayload={previewPayloads?.sourcePayload ?? null}
          targetPayload={previewPayloads?.targetPayload ?? null}
          sourceError={previewPayloads?.sourceError ?? previewRequestError}
          targetError={previewPayloads?.targetError ?? previewRequestError}
          loading={previewLoading}
          selectedMappingId={selectedMappingId}
          onClose={() => setPreviewOpen(false)}
          onRefresh={() => void loadPreview()}
          refreshing={previewLoading}
          sourceUsed={sourceUsed}
          sourceTotal={sourceTotal}
          previewedAt={previewPayloads?.previewedAt ?? null}
        />
      )}

      {/* Transform Editor Drawer */}
      <TransformEditorSheet
        isOpen={transformEditorOpen}
        onClose={() => setTransformEditorOpen(false)}
        mappingId={selectedMappingId}
        mapping={mappingConfig.mappings.find(m => m.id === selectedMappingId)}
        onSave={(transform, transformConfig) => {
          const currentMapping = mappingConfig.mappings.find(m => m.id === selectedMappingId);
          const linkedGroup = currentMapping?.linkedTransformGroup;
          setMappingConfig({
            ...mappingConfig,
            mappings: mappingConfig.mappings.map(m => {
              if (m.id === selectedMappingId) return { ...m, transform, transformConfig };
              // Sync linked transforms
              if (linkedGroup && m.linkedTransformGroup === linkedGroup) return { ...m, transform, transformConfig };
              return m;
            }),
          });
          setUnsavedChanges(true);
          setTransformEditorOpen(false);
        }}
      />

      {/* Validation Toast */}
      {validationMessages.length > 0 && (
        <div className="fixed bottom-3 right-3 z-50 max-w-sm rounded-lg border border-warning/20 bg-warning-bg p-3 shadow-soft">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-warning-text shrink-0 mt-0.5">error</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-warning-text">Validation issues</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-warning-text/90">
                {validationMessages.slice(0, 4).map((msg, idx) => (
                  <li key={`${msg}-${idx}`}>&bull; {msg}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setValidationMessages([])}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-warning/10 transition-colors shrink-0"
              aria-label="Dismiss validation"
            >
              <span className="material-symbols-outlined text-[16px] text-warning-text">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Integration Copilot — conversational panel */}
      <CopilotPanel
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        integrationId={integrationId}
        sourceSchema={sourceSchema}
        targetSchema={targetSchema}
        existingMappings={mappingConfig.mappings}
        onApplyMapping={handleCopilotApplyMapping}
      />
    </div>
  );
}
