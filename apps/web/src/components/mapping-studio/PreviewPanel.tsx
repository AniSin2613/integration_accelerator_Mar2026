'use client';

import { useEffect, useState, useMemo } from 'react';

interface MappingField {
  id: string;
  sourceField: string;
  sourceFields?: string[];
  targetField: string;
  transform: string;
  required?: boolean;
  transformConfig?: string;
  linkedTransformGroup?: string;
}

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
}

interface PreviewPanelProps {
  mappings: MappingField[];
  sourceSchema: StudioSchemaField[];
  targetSchema: StudioSchemaField[];
  sourcePayload?: unknown;
  targetPayload?: Record<string, unknown> | null;
  sourceError?: string | null;
  targetError?: string | null;
  loading?: boolean;
  selectedMappingId: string | null;
  onClose: () => void;
  sourceUsed?: number;
  sourceTotal?: number;
}

export function PreviewPanel({
  mappings,
  sourceSchema,
  targetSchema,
  sourcePayload,
  targetPayload,
  sourceError,
  targetError,
  loading,
  selectedMappingId,
  onClose,
  sourceUsed,
  sourceTotal,
}: PreviewPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const selectedMapping = mappings.find(m => m.id === selectedMappingId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const generateSampleSource = () => {
    const sample: Record<string, unknown> = {};
    sourceSchema.forEach(field => {
      sample[field.path] = field.sampleValue || `Sample${field.label}`;
    });
    return sample;
  };

  const unwrapPreviewPayload = (payload: unknown): Record<string, unknown> | null => {
    if (Array.isArray(payload)) {
      const first = payload[0];
      return first && typeof first === 'object' && !Array.isArray(first) ? first as Record<string, unknown> : null;
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const commonCollectionKeys = ['items', 'records', 'results', 'data', 'value'];
      for (const key of commonCollectionKeys) {
        const candidate = record[key];
        if (Array.isArray(candidate)) {
          const first = candidate[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            return first as Record<string, unknown>;
          }
        }
      }
      return record;
    }

    return null;
  };

  const resolvedSourcePayload = useMemo(() => {
    return unwrapPreviewPayload(sourcePayload) ?? generateSampleSource();
  }, [sourcePayload, sourceSchema]);
  const resolvedTargetPayload = useMemo(() => {
    if (targetPayload && typeof targetPayload === 'object') return targetPayload;
    return {};
  }, [targetPayload]);
  const combinedError = targetError ?? sourceError ?? null;
  const failureStage = useMemo(() => {
    if (!combinedError) return null;
    const normalized = combinedError.toLowerCase();
    if (normalized.includes('preview source fetch failed') || normalized.includes('source fetch')) {
      return {
        label: 'Source Fetch',
        detail: 'The source endpoint request failed before mappings could run.',
      };
    }
    if (normalized.includes('camel-runner') || normalized.includes('preview mapping execution failed')) {
      return {
        label: 'Camel Mapping',
        detail: 'The source payload was fetched, but Camel preview execution failed.',
      };
    }
    return {
      label: 'Preview Runtime',
      detail: 'The preview failed, but the stage could not be identified precisely.',
    };
  }, [combinedError]);
  const unmappedRequired = targetSchema.filter(f => f.required && !mappings.find(m => m.targetField === f.path));

  const copyToClipboard = (section: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Preview Output">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px]"
      />

      <div
        className="relative w-full max-w-[1200px] overflow-hidden rounded-2xl border border-white/50 bg-white/45 shadow-[0_32px_80px_-30px_rgba(15,23,42,0.62)] backdrop-blur-xl"
        style={{ height: '70vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/10" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/50 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-text-muted">preview</span>
            <h2 className="text-[13px] font-semibold text-text-main">Preview Output</h2>
            {selectedMapping && (
              <span className="truncate text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/20">
                {selectedMapping.sourceField} → {selectedMapping.targetField}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft bg-white/70 text-text-muted transition-colors hover:bg-white hover:text-text-main"
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative h-[calc(100%-57px)] overflow-y-auto p-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Source */}
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Source Payload</h3>
              <div className="relative rounded-lg border border-border-soft bg-background-light p-2.5 font-mono text-[10px] text-text-main overflow-x-auto max-h-[58vh]">
            {loading ? (
              <p className="text-[10px] text-text-muted">Loading live source payload…</p>
            ) : sourceError ? (
              <p className="text-[10px] text-warning-text whitespace-pre-wrap">{sourceError}</p>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(resolvedSourcePayload, null, 2)}</pre>
            )}
            <button
              onClick={() => copyToClipboard('source', sourceError ? sourceError : JSON.stringify(resolvedSourcePayload, null, 2))}
              className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-surface transition-colors text-text-muted"
            >
              <span className="material-symbols-outlined text-[12px]">
                {copiedSection === 'source' ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
            </div>

            {/* Target */}
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Target Output (Saved Mappings)</h3>
              <div className="relative rounded-lg border border-border-soft bg-background-light p-2.5 font-mono text-[10px] text-text-main overflow-x-auto max-h-[58vh]">
            {loading ? (
              <p className="text-[10px] text-text-muted">Computing mapped target preview…</p>
            ) : targetError ? (
              <p className="text-[10px] text-warning-text whitespace-pre-wrap">{targetError}</p>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(resolvedTargetPayload, null, 2)}</pre>
            )}
            <button
              onClick={() => copyToClipboard('target', targetError ? targetError : JSON.stringify(resolvedTargetPayload, null, 2))}
              className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-surface transition-colors text-text-muted"
            >
              <span className="material-symbols-outlined text-[12px]">
                {copiedSection === 'target' ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
            </div>

            {/* Issues */}
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Issues</h3>
              <div className="rounded-lg border border-border-soft bg-background-light p-2.5 space-y-1.5 max-h-[58vh] overflow-y-auto">
            {failureStage && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 p-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-danger">error</span>
                  <p className="text-[10px] font-semibold text-danger">Failure Stage: {failureStage.label}</p>
                </div>
                <p className="mt-1 text-[10px] text-danger/80">{failureStage.detail}</p>
              </div>
            )}
            {unmappedRequired.length > 0 && (
              <div className="p-2 rounded-lg bg-warning-bg border border-warning/20">
                <p className="text-[10px] font-semibold text-warning-text mb-1">Missing required fields:</p>
                <ul className="text-[10px] text-warning-text space-y-0.5">
                  {unmappedRequired.map(f => (
                    <li key={f.path}>&bull; {f.label}</li>
                  ))}
                </ul>
              </div>
            )}
            {unmappedRequired.length === 0 && mappings.length > 0 && (
              <div className="p-2 rounded-lg bg-success-bg border border-success/20">
                <p className="text-[10px] font-semibold text-success-text">
                  <span className="material-symbols-outlined text-[12px] align-middle mr-1">check_circle</span>
                  All required fields mapped
                </p>
              </div>
            )}
            {mappings.length === 0 && (
              <p className="text-[10px] text-text-muted">Save at least one mapping to see target preview output</p>
            )}
            {sourceTotal != null && sourceTotal > 0 && (
              <div className={`p-2 rounded-lg border ${sourceUsed === sourceTotal ? 'bg-success-bg border-success/20' : 'bg-background-light border-border-soft'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-[12px] ${sourceUsed === sourceTotal ? 'text-success-text' : 'text-text-muted'}`}>data_object</span>
                  <p className={`text-[10px] font-semibold ${sourceUsed === sourceTotal ? 'text-success-text' : 'text-text-main'}`}>
                    Source fields used: {sourceUsed}/{sourceTotal}
                  </p>
                </div>
                {sourceUsed !== sourceTotal && (
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    {(sourceTotal ?? 0) - (sourceUsed ?? 0)} source field{(sourceTotal ?? 0) - (sourceUsed ?? 0) !== 1 ? 's' : ''} not referenced in any mapping.
                  </p>
                )}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
