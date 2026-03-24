'use client';

import { useEffect } from 'react';
import { TextField, SelectField, NumberField, CheckboxField, KeyValueListEditor } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type SourceGroupConfig } from '../types';
import { MOCK_CONNECTIONS } from '../mockData';

const OPERATIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PAGINATION_STRATEGIES = ['None', 'Offset', 'Cursor'] as const;

interface SourceGroupWorkbenchProps {
  config: SourceGroupConfig;
  onChange: (config: SourceGroupConfig) => void;
}

export function SourceGroupWorkbench({ config, onChange }: SourceGroupWorkbenchProps) {
  const setPrimary = <K extends keyof SourceGroupConfig['primary']>(key: K, value: SourceGroupConfig['primary'][K]) =>
    onChange({ ...config, primary: { ...config.primary, [key]: value } });

  useEffect(() => {
    const needsSingleMode = config.processingPattern !== 'Single Source' || config.enrichmentSources.length > 0;
    const hasLegacyCustomParams = config.primary.customParams.length > 0;
    if (!needsSingleMode && !hasLegacyCustomParams) return;

    onChange({
      ...config,
      processingPattern: 'Single Source',
      enrichmentSources: [],
      primary: {
        ...config.primary,
        queryParams: [...config.primary.queryParams, ...config.primary.customParams],
        customParams: [],
      },
    });
  }, [config, onChange]);

  const selectConnection = (connId: string) => {
    const conn = MOCK_CONNECTIONS.find((c) => c.id === connId);
    if (!conn) return;
    onChange({
      ...config,
      primary: {
        ...config.primary,
        connectionId: conn.id,
        connectionName: conn.name,
        connectionFamily: conn.family,
        healthStatus: conn.status,
      },
    });
  };

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* 1. Source Design Pattern */}
      <WorkbenchSection label="Source Design Pattern">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-[12px] text-primary"
          >
            Single Source
          </button>
          <button
            type="button"
            disabled
            title="Multiple sources are planned for a future release"
            className="rounded-lg border border-border-soft/50 bg-slate-50/50 px-3 py-1.5 text-[12px] text-text-muted/50 cursor-not-allowed"
          >
            Multiple Sources
          </button>
          <div className="h-4 w-px bg-border-soft mx-1" />
          {['Primary + Lookup', 'Parallel Merge'].map((p) => (
            <button
              key={p}
              type="button"
              disabled
              title="Coming in a future release"
              className="flex items-center gap-1.5 rounded-lg border border-border-soft/50 bg-slate-50/50 px-3 py-1.5 text-[12px] text-text-muted/50 cursor-not-allowed"
            >
              {p}
              <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted/50">Soon</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-text-muted">Multiple source orchestration is disabled for this release. Build with one source first.</p>
      </WorkbenchSection>

      {/* 2. Primary Source Configuration */}
      <WorkbenchSection label="Primary Source Configuration">
        <div className="space-y-4">
          <label className="relative block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">Connection</span>
            <select
              value={config.primary.connectionId}
              onChange={(e) => selectConnection(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            >
              <option value="">Select a source connection…</option>
              {MOCK_CONNECTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Business Object" placeholder="Invoice" value={config.primary.businessObject} onChange={(v) => setPrimary('businessObject', v)} />
            <SelectField label="HTTP Method" value={config.primary.operation} options={OPERATIONS} onChange={(v) => setPrimary('operation', v)} />
            <div className="col-span-2">
              <TextField label="Endpoint / Path" placeholder="/api/invoices" value={config.primary.endpointPath} onChange={(v) => setPrimary('endpointPath', v)} />
            </div>
          </div>

          <KeyValueListEditor label="Parameters" entries={config.primary.queryParams} onChange={(entries) => setPrimary('queryParams', entries)} />
        </div>
      </WorkbenchSection>

      {/* 3. Global Source Settings */}
      <WorkbenchSection label="Global Source Settings">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <CheckboxField label="Enable pagination" checked={config.primary.paginationEnabled} onChange={(v) => setPrimary('paginationEnabled', v)} />
            {config.primary.paginationEnabled && (
              <div className="flex flex-col gap-3 ml-6">
                <SelectField label="Strategy" value={config.primary.paginationStrategy} options={[...PAGINATION_STRATEGIES]} onChange={(v) => setPrimary('paginationStrategy', v as SourceGroupConfig['primary']['paginationStrategy'])} />
                <NumberField label="Page Size" value={config.primary.pageSize} min={1} max={10000} onChange={(v) => setPrimary('pageSize', v)} />
              </div>
            )}
          </div>
          <SelectField label="Incremental Read" value={config.primary.incrementalReadMode} options={['Off', 'Timestamp Cursor']} onChange={(v) => setPrimary('incrementalReadMode', v as SourceGroupConfig['primary']['incrementalReadMode'])} />
        </div>
      </WorkbenchSection>
    </div>
  );
}
