'use client';

import { useEffect, useMemo } from 'react';
import { TextField, SelectField, NumberField, CheckboxField, KeyValueListEditor } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type SourceGroupConfig } from '../types';

const OPERATIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PAGINATION_STRATEGIES = ['None', 'Offset', 'Cursor'] as const;

interface SourceGroupWorkbenchProps {
  config: SourceGroupConfig;
  connections: Array<{ id: string; name: string; family: string; status: string; baseUrl?: string }>;
  onChange: (config: SourceGroupConfig) => void;
}

export function SourceGroupWorkbench({ config, connections, onChange }: SourceGroupWorkbenchProps) {
  const availableConnections = connections;

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
    const conn = availableConnections.find((c) => c.id === connId);
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

  const resolvedUrl = useMemo(() => {
    const conn = availableConnections.find((c) => c.id === config.primary.connectionId);
    if (!conn || !config.primary.endpointPath || !conn.baseUrl) return null;
    const base = conn.baseUrl.replace(/\/$/, '');
    const path = config.primary.endpointPath.startsWith('/')
      ? config.primary.endpointPath
      : `/${config.primary.endpointPath}`;
    const qs = config.primary.queryParams
      .filter((p) => String(p.key ?? '').trim().length > 0)
      .map((p) => `${encodeURIComponent(String(p.key))}=${encodeURIComponent(String(p.value ?? ''))}`)
      .join('&');
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }, [availableConnections, config.primary.connectionId, config.primary.endpointPath, config.primary.queryParams]);

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* 1. Source Configuration */}
      <WorkbenchSection label="Source Configuration">
        <div className="space-y-4">
          <label className="relative block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">Connection</span>
            <select
              value={config.primary.connectionId}
              onChange={(e) => selectConnection(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            >
              <option value="">Select a source connection…</option>
              {availableConnections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
            {availableConnections.length === 0 && (
              <p className="mt-1 text-[11px] text-text-muted">No saved connections found for this workspace.</p>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Business Object" placeholder="Invoice" value={config.primary.businessObject} onChange={(v) => setPrimary('businessObject', v)} />
            <SelectField label="HTTP Method" value={config.primary.operation} options={OPERATIONS} onChange={(v) => setPrimary('operation', v)} />
            <div className="col-span-2">
              <TextField label="Endpoint / Path" placeholder="/api/invoices" value={config.primary.endpointPath} onChange={(v) => setPrimary('endpointPath', v)} />
            </div>
          </div>

          <div className="space-y-4">
            <KeyValueListEditor label="Query Parameters" entries={config.primary.queryParams} onChange={(entries) => setPrimary('queryParams', entries)} />
            <KeyValueListEditor label="Headers" entries={config.primary.headers ?? []} onChange={(entries) => setPrimary('headers', entries)} />
          </div>

          <div className="space-y-4">
            <SelectField label="Incremental Read" value={config.primary.incrementalReadMode} options={['Off', 'Timestamp Cursor']} onChange={(v) => setPrimary('incrementalReadMode', v as SourceGroupConfig['primary']['incrementalReadMode'])} />

            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-3">
              <div className="space-y-3">
                <CheckboxField label="Enable pagination" checked={config.primary.paginationEnabled} onChange={(v) => setPrimary('paginationEnabled', v)} />
                {config.primary.paginationEnabled && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <SelectField label="Strategy" value={config.primary.paginationStrategy} options={[...PAGINATION_STRATEGIES]} onChange={(v) => setPrimary('paginationStrategy', v as SourceGroupConfig['primary']['paginationStrategy'])} />
                    <NumberField label="Page Size" value={config.primary.pageSize} min={1} max={10000} onChange={(v) => setPrimary('pageSize', v)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </WorkbenchSection>

      {/* 2. Full endpoint preview */}
      {resolvedUrl && (
        <WorkbenchSection label="Resolved Endpoint Preview">
          <div className="rounded-lg border border-dashed border-border-soft bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">link</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">Full Source Endpoint</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {config.primary.operation}
              </span>
              <code className="text-[11px] font-mono text-text-main break-all select-all">{resolvedUrl}</code>
            </div>
            {config.primary.paginationEnabled && (
              <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">pages</span>
                Pagination: {config.primary.paginationStrategy} · Page size {config.primary.pageSize}
              </p>
            )}
          </div>
        </WorkbenchSection>
      )}
    </div>
  );
}
