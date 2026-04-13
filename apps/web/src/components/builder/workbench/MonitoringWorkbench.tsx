'use client';

import { useState } from 'react';
import { TextField, SelectField, NumberField, CheckboxField } from '@/components/ui/FormFields';
import { type MonitoringConfig, type AlertChannel } from '../types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function RadioOption({ label, selected, onSelect }: {
  label: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <label onClick={onSelect} className="flex items-start gap-2.5 cursor-pointer group">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-primary bg-primary' : 'border-slate-300 group-hover:border-slate-400'}`}>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-[12px] leading-snug text-text-main">{label}</span>
    </label>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border-soft bg-white/60">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50/60">
        <span className="material-symbols-outlined text-[16px] text-text-muted">{icon}</span>
        <span className="flex-1 text-[12px] font-semibold text-text-main">{title}</span>
        <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && <div className="border-t border-border-soft px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle, tint }: {
  title: string; subtitle: string; tint?: 'success' | 'danger' | 'neutral';
}) {
  const border = tint === 'success' ? 'border-l-emerald-400' : tint === 'danger' ? 'border-l-rose-400' : 'border-l-slate-300';
  return (
    <div className={`border-l-[3px] ${border} pl-3`}>
      <h3 className="text-[13px] font-semibold text-text-main">{title}</h3>
      <p className="text-[11px] text-text-muted">{subtitle}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Banner                                                     */
/* ------------------------------------------------------------------ */

function SummaryBanner({ config }: { config: MonitoringConfig }) {
  const successParts: string[] = [];
  if (config.storeRunHistory) successParts.push(`Run stored for ${config.retentionDays} days`);
  if (config.notifyOnSuccess && config.notificationType !== 'None') successParts.push('Notify admin');
  const successLine = successParts.length > 0 ? successParts.join(' · ') : 'No actions configured';

  let failureLine = '';
  switch (config.failureBehavior) {
    case 'retry':
      failureLine = `Retry ${config.retryAttempts} time${config.retryAttempts !== 1 ? 's' : ''}`;
      if (config.afterFinalFailureNotify) failureLine += ' → Notify admin';
      break;
    case 'stop': failureLine = 'Stop immediately'; break;
    case 'move_to_failed_queue': failureLine = 'Move to failed queue'; break;
    default: failureLine = 'Not configured';
  }

  return (
    <div className="rounded-xl border border-border-soft bg-slate-50/80 px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Summary</p>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-[14px] text-emerald-500 mt-px">check_circle</span>
        <p className="text-[12px] text-text-main"><span className="font-semibold text-emerald-600">Success</span> → {successLine}</p>
      </div>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-[14px] text-rose-500 mt-px">cancel</span>
        <p className="text-[12px] text-text-main"><span className="font-semibold text-rose-600">Failure</span> → {failureLine}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

const NOTIFICATION_TYPES: AlertChannel[] = ['None', 'Email', 'Slack', 'Webhook'];
const RETENTION_OPTIONS = [7, 30, 90];

interface MonitoringWorkbenchProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
}

export function MonitoringWorkbench({ config, onChange }: MonitoringWorkbenchProps) {
  const set = <K extends keyof MonitoringConfig>(key: K, value: MonitoringConfig[K]) =>
    onChange({ ...config, [key]: value });

  const isCustomRetention = !RETENTION_OPTIONS.includes(config.retentionDays);

  return (
    <div className="p-4 space-y-5 pb-6">

      {/* ── SUMMARY ────────────────────────────────────────────── */}
      <SummaryBanner config={config} />

      {/* ── 1. RUN HISTORY ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="What should be recorded for each run?" subtitle="Control what data is stored and for how long" />

        <div className="space-y-2">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Store run history" checked={config.storeRunHistory} onChange={(v) => set('storeRunHistory', v)} />
          </div>
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Store error details" checked={config.storeErrorDetails} onChange={(v) => set('storeErrorDetails', v)} />
          </div>
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Store payload snapshots" checked={config.storePayloadSnapshots} onChange={(v) => set('storePayloadSnapshots', v)} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">Retention</p>
          <div className="space-y-2">
            {RETENTION_OPTIONS.map((days) => (
              <RadioOption key={days} label={`${days} days`} selected={config.retentionDays === days} onSelect={() => set('retentionDays', days)} />
            ))}
            <RadioOption label="Custom" selected={isCustomRetention} onSelect={() => { if (!isCustomRetention) set('retentionDays', 60); }} />
            {isCustomRetention && (
              <div className="pl-6 pt-1">
                <NumberField label="Days" value={config.retentionDays} min={1} max={365} onChange={(v) => set('retentionDays', v)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. FAILURE RECOVERY ────────────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="What should happen when a run fails?" subtitle="Define the recovery strategy" tint="danger" />

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">Failure Behavior</p>
          <div className="space-y-2">
            <RadioOption label="Retry automatically" selected={config.failureBehavior === 'retry'} onSelect={() => set('failureBehavior', 'retry')} />
            <RadioOption label="Stop immediately" selected={config.failureBehavior === 'stop'} onSelect={() => set('failureBehavior', 'stop')} />
            <RadioOption label="Move to failed queue" selected={config.failureBehavior === 'move_to_failed_queue'} onSelect={() => set('failureBehavior', 'move_to_failed_queue')} />
          </div>
        </div>

        {config.failureBehavior === 'retry' && (
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-3">
            <p className="text-[11px] font-semibold text-text-muted mb-2">Retry Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Attempts" value={config.retryAttempts} min={1} max={10} onChange={(v) => set('retryAttempts', v)} />
              <SelectField label="Interval" value={config.retryInterval} options={['1 min', '5 min', '15 min', '30 min', '1 hour']} onChange={(v) => set('retryInterval', v as MonitoringConfig['retryInterval'])} />
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">Partial Success Handling</p>
          <div className="space-y-2">
            <RadioOption label="Fail entire transaction" selected={config.partialSuccessPolicy === 'fail_entire_transaction'} onSelect={() => set('partialSuccessPolicy', 'fail_entire_transaction')} />
            <RadioOption label="Allow partial success" selected={config.partialSuccessPolicy === 'allow_partial_success'} onSelect={() => set('partialSuccessPolicy', 'allow_partial_success')} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">After Final Failure</p>
          <div className="space-y-2">
            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
              <CheckboxField label="Notify admin" checked={config.afterFinalFailureNotify} onChange={(v) => set('afterFinalFailureNotify', v)} />
            </div>
            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
              <CheckboxField label="Mark run as failed" checked={config.afterFinalFailureMarkFailed} onChange={(v) => set('afterFinalFailureMarkFailed', v)} />
            </div>
            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
              <CheckboxField label="Move to failed queue" checked={config.afterFinalFailureMoveToQueue} onChange={(v) => set('afterFinalFailureMoveToQueue', v)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ALERTS ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="Who should be informed?" subtitle="Configure alert triggers and recipients" />

        <div className="space-y-2">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Notify on first failure" checked={config.notifyOnFirstFailure} onChange={(v) => set('notifyOnFirstFailure', v)} />
          </div>
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Notify after final failure" checked={config.notifyAfterFinalFailure} onChange={(v) => set('notifyAfterFinalFailure', v)} />
          </div>
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
            <CheckboxField label="Notify on success" checked={config.notifyOnSuccess} onChange={(v) => set('notifyOnSuccess', v)} />
          </div>
        </div>

        <TextField
          label="Recipients"
          value={config.alertRecipients}
          placeholder="admin@company.com"
          onChange={(v) => set('alertRecipients', v)}
        />

        <SelectField
          label="Notification Type"
          value={config.notificationType}
          options={NOTIFICATION_TYPES}
          onChange={(v) => set('notificationType', v as AlertChannel)}
        />
      </div>

      {/* ── 4. ADVANCED MONITORING (collapsed) ─────────────────── */}
      <CollapsibleSection title="Advanced Monitoring" icon="tune">
        <div className="space-y-2">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
            <CheckboxField label="Enable detailed diagnostics" checked={config.enableDetailedDiagnostics} onChange={(v) => set('enableDetailedDiagnostics', v)} />
          </div>
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
            <CheckboxField label="Include payload in alerts" checked={config.includePayloadInAlerts} onChange={(v) => set('includePayloadInAlerts', v)} />
          </div>
        </div>

        <SelectField label="Logging Level" value={config.loggingLevel} options={['Minimal', 'Standard', 'Verbose']} onChange={(v) => set('loggingLevel', v as MonitoringConfig['loggingLevel'])} />

        <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
          <CheckboxField label="Enable debug logging" checked={config.debugMode} onChange={(v) => set('debugMode', v)} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
