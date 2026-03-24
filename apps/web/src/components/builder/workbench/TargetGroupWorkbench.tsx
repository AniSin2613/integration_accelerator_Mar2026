'use client';

import { useEffect } from 'react';
import { TextField, SelectField, NumberField, KeyValueListEditor } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type TargetDestination, type TargetGroupConfig } from '../types';
import { MOCK_CONNECTIONS } from '../mockData';

const OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const WRITE_MODES: TargetDestination['writeMode'][] = ['Create', 'Upsert', 'Update'];

interface TargetGroupWorkbenchProps {
  config: TargetGroupConfig;
  onChange: (config: TargetGroupConfig) => void;
}

function createPrimaryTarget(): TargetDestination {
  return {
    id: `tgt-${Date.now()}`,
    name: 'Primary Target',
    priority: 1,
    connectionId: '',
    connectionName: '',
    connectionFamily: '',
    healthStatus: '',
    businessObject: '',
    operation: 'POST',
    endpointPath: '',
    writeMode: 'Create',
    upsertKeyField: '',
    batchSize: 1,
    params: [],
    conflictHandling: 'Overwrite',
  };
}

export function TargetGroupWorkbench({ config, onChange }: TargetGroupWorkbenchProps) {
  useEffect(() => {
    if (config.targets.length === 0) {
      onChange({ ...config, deliveryPattern: 'Single Target', targets: [createPrimaryTarget()] });
      return;
    }
    if (config.deliveryPattern !== 'Single Target' || config.targets.length > 1) {
      const primary = { ...config.targets[0], priority: 1 };
      onChange({ ...config, deliveryPattern: 'Single Target', targets: [primary] });
    }
  }, [config, onChange]);

  const updateTarget = (id: string, patch: Partial<TargetDestination>) => {
    onChange({ ...config, targets: config.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  };

  const selectConnection = (id: string, connId: string) => {
    const conn = MOCK_CONNECTIONS.find((c) => c.id === connId);
    if (!conn) return;
    updateTarget(id, {
      connectionId: conn.id,
      connectionName: conn.name,
      connectionFamily: conn.family,
      healthStatus: conn.status,
    });
  };

  const selectedTarget = config.targets[0] ?? null;

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* 1. Target Design Pattern — architectural decision first */}
      <WorkbenchSection label="Target Design Pattern">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-[12px] text-primary"
          >
            Single Target
          </button>
          <button
            type="button"
            disabled
            title="Multiple targets are planned for a future release"
            className="rounded-lg border border-border-soft/50 bg-slate-50/50 px-3 py-1.5 text-[12px] text-text-muted/50 cursor-not-allowed"
          >
            Multiple Targets
          </button>
          <div className="h-4 w-px bg-border-soft mx-1" />
          {['Fan-out to All', 'Scatter-Gather'].map((p) => (
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
        <p className="mt-2 text-[11px] text-text-muted">Multiple target orchestration is disabled for this release. Build with one target first.</p>
      </WorkbenchSection>

      {/* 2. Primary Target Configuration */}
      <WorkbenchSection label="Primary Target Configuration">
        {selectedTarget ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <TextField label="Target Name" value={selectedTarget.name} onChange={(v) => updateTarget(selectedTarget.id, { name: v })} />
              <SelectField label="HTTP Method" value={selectedTarget.operation} options={OPERATIONS} onChange={(v) => updateTarget(selectedTarget.id, { operation: v })} />
              <NumberField label="Priority" value={selectedTarget.priority} min={1} max={9} onChange={(v) => updateTarget(selectedTarget.id, { priority: v })} />
            </div>

            <label className="relative block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Connection</span>
              <select value={selectedTarget.connectionId} onChange={(e) => selectConnection(selectedTarget.id, e.target.value)} className="mt-1 w-full appearance-none rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all">
                <option value="">Select target connection…</option>
                {MOCK_CONNECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <TextField label="Business Object" value={selectedTarget.businessObject} placeholder="SupplierInvoice" onChange={(v) => updateTarget(selectedTarget.id, { businessObject: v })} />
              <SelectField label="Write Mode" value={selectedTarget.writeMode} options={WRITE_MODES} onChange={(v) => updateTarget(selectedTarget.id, { writeMode: v as TargetDestination['writeMode'] })} />
              <div className="col-span-2">
                <TextField label="Endpoint / Path" value={selectedTarget.endpointPath} placeholder="/sap/api/invoices" onChange={(v) => updateTarget(selectedTarget.id, { endpointPath: v })} />
              </div>
              <NumberField label="Batch Size" value={selectedTarget.batchSize} min={1} max={10000} onChange={(v) => updateTarget(selectedTarget.id, { batchSize: v })} />
              <SelectField label="Conflict Handling" value={selectedTarget.conflictHandling} options={['Overwrite', 'Skip Existing', 'Fail on Conflict']} onChange={(v) => updateTarget(selectedTarget.id, { conflictHandling: v as TargetDestination['conflictHandling'] })} />
            </div>

            <KeyValueListEditor label="Parameters" entries={selectedTarget.params} onChange={(entries) => updateTarget(selectedTarget.id, { params: entries })} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-soft bg-slate-50/70 px-3 py-3 text-[12px] text-text-muted">
            Preparing default target configuration…
          </div>
        )}
      </WorkbenchSection>
    </div>
  );
}
