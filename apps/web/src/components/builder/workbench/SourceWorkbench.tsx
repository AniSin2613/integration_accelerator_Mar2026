'use client';

import { useMemo } from 'react';
import { TextField, SelectField, NumberField, CheckboxField, KeyValueListEditor } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type SourceConfig } from '../types';
import { MOCK_CONNECTIONS } from '../mockData';

/* ------------------------------------------------------------------ */
/*  SourceWorkbench – bottom panel for source connection + interface    */
/* ------------------------------------------------------------------ */

const OPERATIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PAGINATION_STRATEGIES = ['None', 'Offset', 'Cursor'] as const;

interface SourceWorkbenchProps {
  config: SourceConfig;
  onChange: (config: SourceConfig) => void;
}

export function SourceWorkbench({ config, onChange }: SourceWorkbenchProps) {
  const set = <K extends keyof SourceConfig>(key: K, value: SourceConfig[K]) =>
    onChange({ ...config, [key]: value });

  const selectConnection = (connId: string) => {
    const conn = MOCK_CONNECTIONS.find((c) => c.id === connId);
    if (conn) {
      onChange({ ...config, connectionId: conn.id, connectionName: conn.name, connectionFamily: conn.family, healthStatus: conn.status });
    }
  };

  const resolvedUrl = useMemo(() => {
    const conn = MOCK_CONNECTIONS.find((c) => c.id === config.connectionId);
    if (!conn || !config.endpointPath) return null;
    const base = conn.baseUrl.replace(/\/$/, '');
    const path = config.endpointPath.startsWith('/') ? config.endpointPath : `/${config.endpointPath}`;
    const qs = config.queryParams?.filter((p) => p.key).map((p) => `${p.key}=${p.value}`).join('&');
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }, [config.connectionId, config.endpointPath, config.queryParams]);

  return (
    <div className="p-5">
      <div className="grid grid-cols-[340px_1fr] gap-6">
        {/* Left: Connection */}
        <WorkbenchSection label="Source Connection">
          <div className="space-y-3">
            <label className="relative block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Choose Connection</span>
              <select
                value={config.connectionId}
                onChange={(e) => selectConnection(e.target.value)}
                className="mt-1 w-full appearance-none rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="">Select a connection…</option>
                {MOCK_CONNECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                ))}
              </select>
            </label>

            {config.connectionId && (
              <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className={`h-2 w-2 rounded-full ${config.healthStatus === 'Healthy' ? 'bg-success' : 'bg-warning'}`} />
                  <span className="font-medium text-text-main">{config.connectionName}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{config.connectionFamily}</p>
              </div>
            )}

            {!config.connectionId && (
              <button type="button" className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Add New Connection
              </button>
            )}
          </div>
        </WorkbenchSection>

        {/* Right: Interface */}
        <WorkbenchSection label="Source Interface">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Business Object" placeholder="Invoice, Purchase Order…" value={config.businessObject} onChange={(v) => set('businessObject', v)} />
            <SelectField label="HTTP Method" value={config.operation} options={OPERATIONS} onChange={(v) => set('operation', v)} />
            <div className="col-span-2">
              <TextField label="Endpoint Path" placeholder="/api/invoices" value={config.endpointPath} onChange={(v) => set('endpointPath', v)} />
            </div>
            <div className="col-span-2">
              <KeyValueListEditor label="Query Parameters" entries={config.queryParams} onChange={(entries) => set('queryParams', entries)} />
            </div>
            <div className="col-span-2 flex items-start gap-6">
              <div className="space-y-3">
                <CheckboxField label="Enable pagination" checked={config.paginationEnabled} onChange={(v) => set('paginationEnabled', v)} />
                {config.paginationEnabled && (
                  <div className="flex gap-3 ml-6">
                    <SelectField label="Strategy" value={config.paginationStrategy} options={[...PAGINATION_STRATEGIES]} onChange={(v) => set('paginationStrategy', v as SourceConfig['paginationStrategy'])} />
                    <NumberField label="Page Size" value={config.pageSize} min={1} max={10000} onChange={(v) => set('pageSize', v)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </WorkbenchSection>
      </div>

      {/* Resolved Endpoint Preview */}
      {config.connectionId && config.endpointPath && resolvedUrl && (
        <div className="mt-4 rounded-lg border border-dashed border-border-soft bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">link</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">Resolved Endpoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{config.operation}</span>
            <code className="text-[11px] font-mono text-text-main break-all select-all">{resolvedUrl}</code>
          </div>
          {config.paginationEnabled && (
            <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">pages</span>
              Pagination: {config.paginationStrategy} · Page size {config.pageSize}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
