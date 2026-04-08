'use client';

import { useEffect, useMemo, useState } from 'react';
import { TextField, SelectField, NumberField } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type TargetConfig, type WriteMode } from '../types';
import { DEFAULT_WORKSPACE_SLUG } from '@/lib/workspace';
import { api } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  TargetWorkbench – bottom panel for target connection + interface    */
/* ------------------------------------------------------------------ */

const OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const WRITE_MODES: WriteMode[] = ['Create', 'Upsert', 'Update'];

function toHealthLabel(raw: unknown): string {
  const normalized = String(raw ?? '').toLowerCase();
  if (normalized === 'healthy') return 'Healthy';
  if (normalized === 'warning') return 'Warning';
  if (normalized === 'failed') return 'Failed';
  return 'Untested';
}

interface TargetWorkbenchProps {
  config: TargetConfig;
  onChange: (config: TargetConfig) => void;
}

export function TargetWorkbench({ config, onChange }: TargetWorkbenchProps) {
  const [connections, setConnections] = useState<Array<{ id: string; name: string; family: string; status: string; baseUrl?: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.get<any[]>(`/connections?slug=${encodeURIComponent(DEFAULT_WORKSPACE_SLUG)}`);
        if (cancelled) return;
        setConnections(
          rows.map((row) => ({
            id: String(row.id),
            name: String(row.name ?? 'Unnamed connection'),
            family: String(row.family ?? 'Unknown'),
            status: toHealthLabel(row.health),
            baseUrl: row.baseUrl ? String(row.baseUrl) : undefined,
          })),
        );
      } catch {
        if (!cancelled) setConnections([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof TargetConfig>(key: K, value: TargetConfig[K]) =>
    onChange({ ...config, [key]: value });

  const selectConnection = (connId: string) => {
    const conn = connections.find((c) => c.id === connId);
    if (conn) {
      onChange({ ...config, connectionId: conn.id, connectionName: conn.name, connectionFamily: conn.family, healthStatus: conn.status });
    }
  };

  const resolvedUrl = useMemo(() => {
    const conn = connections.find((c) => c.id === config.connectionId);
    if (!conn || !config.endpointPath) return null;
    const base = (conn.baseUrl ?? '').replace(/\/$/, '');
    if (!base) return null;
    const path = config.endpointPath.startsWith('/') ? config.endpointPath : `/${config.endpointPath}`;
    return `${base}${path}`;
  }, [connections, config.connectionId, config.endpointPath]);

  return (
    <div className="p-5">
      <div className="grid grid-cols-[340px_1fr] gap-6">
        {/* Left: Connection */}
        <WorkbenchSection label="Target Connection">
          <div className="space-y-3">
            <label className="relative block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Choose Connection</span>
              <select
                value={config.connectionId}
                onChange={(e) => selectConnection(e.target.value)}
                className="mt-1 w-full appearance-none rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              >
                <option value="">Select a connection…</option>
                {connections.map((c) => (
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
        <WorkbenchSection label="Target Interface">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Business Object" placeholder="Invoice, Supplier…" value={config.businessObject} onChange={(v) => set('businessObject', v)} />
            <SelectField label="HTTP Method" value={config.operation} options={OPERATIONS} onChange={(v) => set('operation', v)} />
            <div className="col-span-2">
              <TextField label="Endpoint Path" placeholder="/sap/opu/odata/..." value={config.endpointPath} onChange={(v) => set('endpointPath', v)} />
            </div>
            <SelectField label="Write Mode" value={config.writeMode} options={WRITE_MODES} onChange={(v) => set('writeMode', v)} />
            <NumberField label="Batch Size" value={config.batchSize} min={1} max={10000} onChange={(v) => set('batchSize', v)} />
            {config.writeMode === 'Upsert' && (
              <div className="col-span-2">
                <TextField label="Upsert Key Field" placeholder="BELNR" value={config.upsertKeyField} onChange={(v) => set('upsertKeyField', v)} />
              </div>
            )}
          </div>
        </WorkbenchSection>
      </div>

      {/* Resolved Endpoint Preview */}
      {config.connectionId && config.endpointPath && resolvedUrl && (
        <div className="mt-4 rounded-lg border border-dashed border-border-soft bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="material-symbols-outlined text-[14px] text-sky-600">link</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">Resolved Endpoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{config.operation}</span>
            <code className="text-[11px] font-mono text-text-main break-all select-all">{resolvedUrl}</code>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">edit_note</span>Write mode: {config.writeMode}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">stacks</span>Batch: {config.batchSize}</span>
            {config.writeMode === 'Upsert' && config.upsertKeyField && (
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">key</span>Key: {config.upsertKeyField}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
