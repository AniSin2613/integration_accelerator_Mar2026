'use client';

import { useEffect, useMemo } from 'react';
import { TextField, SelectField, NumberField, KeyValueListEditor } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type TargetDestination, type TargetGroupConfig, type TargetProfileStatus } from '../types';

const OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const WRITE_MODES: TargetDestination['writeMode'][] = ['Create', 'Upsert', 'Update'];

const PROFILE_STATUS_LABELS: Record<TargetProfileStatus, string> = {
  'none': 'No profile',
  'baseline-only': 'Baseline only',
  'profile-ready': 'Profile ready',
  'overlay-active': 'Overlay active',
  'drift-suspected': 'Drift suspected',
};

const PROFILE_STATUS_COLORS: Record<TargetProfileStatus, { icon: string; bg: string; text: string }> = {
  'none': { icon: 'help_outline', bg: 'bg-slate-100', text: 'text-slate-500' },
  'baseline-only': { icon: 'description', bg: 'bg-amber-50', text: 'text-amber-600' },
  'profile-ready': { icon: 'verified', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'overlay-active': { icon: 'layers', bg: 'bg-ai-bg', text: 'text-ai' },
  'drift-suspected': { icon: 'sync_problem', bg: 'bg-rose-50', text: 'text-rose-600' },
};

function ProfileStatusIcon({ status }: { status: TargetProfileStatus }) {
  const colors = PROFILE_STATUS_COLORS[status];
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${colors.bg}`}>
      <span className={`material-symbols-outlined text-[16px] ${colors.text}`}>{colors.icon}</span>
    </span>
  );
}

interface TargetGroupWorkbenchProps {
  config: TargetGroupConfig;
  connections: Array<{ id: string; name: string; family: string; status: string; baseUrl?: string }>;
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

export function TargetGroupWorkbench({ config, connections, onChange }: TargetGroupWorkbenchProps) {
  const availableConnections = connections;

  // Detect JSON/XML demo output target from params
  const demoTargetType = (() => {
    const params = config.targets[0]?.params ?? [];
    const param = params.find((p) => String(p.key ?? '').toLowerCase() === 'demotargettype');
    const val = String(param?.value ?? '').toUpperCase();
    return val === 'JSON' || val === 'XML' ? val : null;
  })();

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
    const conn = availableConnections.find((c) => c.id === connId);
    if (!conn) return;
    updateTarget(id, {
      connectionId: conn.id,
      connectionName: conn.name,
      connectionFamily: conn.family,
      healthStatus: conn.status,
    });
  };

  const selectedTarget = config.targets[0] ?? null;

  const resolvedTargetUrl = useMemo(() => {
    if (!selectedTarget?.connectionId || !selectedTarget.endpointPath) return null;
    const conn = availableConnections.find((c) => c.id === selectedTarget.connectionId);
    if (!conn?.baseUrl) return null;
    const base = conn.baseUrl.replace(/\/$/, '');
    const path = selectedTarget.endpointPath.startsWith('/')
      ? selectedTarget.endpointPath
      : `/${selectedTarget.endpointPath}`;
    const qs = (selectedTarget.params ?? [])
      .filter((p) => String(p.key ?? '').trim().length > 0)
      .map((p) => `${encodeURIComponent(String(p.key))}=${encodeURIComponent(String(p.value ?? ''))}`)
      .join('&');
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }, [availableConnections, selectedTarget]);

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* 1. Primary Target Configuration */}
      <WorkbenchSection label="Primary Target Configuration">
        {/* Demo JSON/XML output — no real connection needed */}
        {demoTargetType ? (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  {demoTargetType === 'XML' ? 'code' : 'data_object'}
                </span>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-text-main">
                  {demoTargetType === 'XML' ? 'XML File Output' : 'JSON File Output'}
                </p>
                <p className="text-[11px] text-text-muted">Demo target — no external connection required</p>
              </div>
              <span className="ml-auto inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                {demoTargetType}
              </span>
            </div>
            <div className="rounded-md border border-primary/15 bg-surface px-3 py-2.5 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-ai/70 shrink-0 mt-0.5">auto_fix_high</span>
              <div>
                <p className="text-[12px] font-medium text-text-main">Target schema mirrors source schema</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  When you configure the source system and interface, the target field list is automatically derived from the source schema.
                  No target profile is required. Map source fields to themselves to reshape or rename the output.
                </p>
              </div>
            </div>
          </div>
        ) : selectedTarget ? (
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
                {availableConnections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                ))}
              </select>
              {availableConnections.length === 0 && (
                <p className="mt-1 text-[11px] text-text-muted">No saved connections found for this workspace.</p>
              )}
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
      {/* 2. Target Profile Status — hidden for demo JSON/XML targets */}
      {!demoTargetType && config.targetProfileState && (
        <WorkbenchSection label="Target Profile">
          <div className="rounded-lg border border-border-soft bg-background-light px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ProfileStatusIcon status={config.targetProfileState.status} />
                <div>
                  <p className="text-[13px] font-semibold text-text-main">{config.targetProfileState.profileName}</p>
                  <p className="text-[11px] text-text-muted">{config.targetProfileState.system} / {config.targetProfileState.object}</p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${config.targetProfileState.isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {config.targetProfileState.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">list_alt</span>
                {config.targetProfileState.effectiveFieldCount} fields
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">priority_high</span>
                {config.targetProfileState.effectiveRequiredCount} required
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">info</span>
                {PROFILE_STATUS_LABELS[config.targetProfileState.status]}
              </span>
            </div>
          </div>
        </WorkbenchSection>
      )}

      {/* 3. Full endpoint preview for real target connections */}
      {!demoTargetType && selectedTarget && resolvedTargetUrl && (
        <WorkbenchSection label="Resolved Endpoint Preview">
          <div className="rounded-lg border border-dashed border-border-soft bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-[14px] text-sky-600">link</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">Full Target Endpoint</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                {selectedTarget.operation}
              </span>
              <code className="text-[11px] font-mono text-text-main break-all select-all">{resolvedTargetUrl}</code>
            </div>
          </div>
        </WorkbenchSection>
      )}
    </div>
  );
}
