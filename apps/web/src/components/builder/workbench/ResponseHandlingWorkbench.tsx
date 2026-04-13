'use client';

import { useState } from 'react';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormFields';
import { type ResponseHandlingConfig } from '../types';

interface ResponseHandlingWorkbenchProps {
  config: ResponseHandlingConfig;
  onChange: (config: ResponseHandlingConfig) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function RadioOption({ label, selected, onSelect, children }: {
  label: string; selected: boolean; onSelect: () => void; children?: React.ReactNode;
}) {
  return (
    <label onClick={onSelect} className="flex items-start gap-2.5 cursor-pointer group">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-primary bg-primary' : 'border-slate-300 group-hover:border-slate-400'}`}>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-[12px] leading-snug text-text-main">
        {label}
        {children && selected && <span className="ml-2">{children}</span>}
      </span>
    </label>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border-soft bg-white/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50/60"
      >
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

function SummaryBanner({ config }: { config: ResponseHandlingConfig }) {
  const successParts: string[] = [];
  if (config.outputToSource === 'auto_if_expected') successParts.push('Response sent to source');
  if (config.storeResponse) successParts.push('Stored');
  if (config.transformResponse) successParts.push('Transformed');
  if (config.notificationEnabled && config.notificationOnSuccess) successParts.push('Notify another system');
  const successLine = successParts.length > 0 ? successParts.join(' · ') : 'No actions configured';

  const failureParts: string[] = [];
  if (config.businessErrorTranslationEnabled) failureParts.push('Business error response sent to source');
  if (config.notificationEnabled && config.notificationOnFailure) failureParts.push('Notify another system');
  if (config.outputToSource === 'no_response' && !config.notificationEnabled) failureParts.push('No source response, no notification');
  const failureLine = failureParts.length > 0 ? failureParts.join(' · ') : 'No failure output configured';

  return (
    <div className="rounded-xl border border-border-soft bg-slate-50/80 px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Outcome Summary</p>
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

export function ResponseHandlingWorkbench({ config, onChange }: ResponseHandlingWorkbenchProps) {
  const set = <K extends keyof ResponseHandlingConfig>(key: K, value: ResponseHandlingConfig[K]) =>
    onChange({ ...config, [key]: value });

  const [showResponseMapping, setShowResponseMapping] = useState(false);
  const [showNotificationMapping, setShowNotificationMapping] = useState(false);

  return (
    <div className="p-4 space-y-5 pb-6">

      {/* ── SUMMARY ────────────────────────────────────────────── */}
      <SummaryBanner config={config} />

      {/* ── 1. SUCCESS HANDLING ────────────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="What should happen on success?" subtitle="Define how successful target responses are handled" tint="success" />

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">Success Criteria</p>
          <div className="space-y-2">
            <RadioOption label="Any successful response" selected={config.successCriteria === 'any_success'} onSelect={() => set('successCriteria', 'any_success')} />
            <RadioOption label="Only 2xx responses" selected={config.successCriteria === 'only_2xx'} onSelect={() => set('successCriteria', 'only_2xx')} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-2">On Success Actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
              <CheckboxField label="Store response" checked={config.storeResponse} onChange={(v) => set('storeResponse', v)} />
            </div>
            <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
              <CheckboxField label="Transform response" checked={config.transformResponse} onChange={(v) => set('transformResponse', v)} />
            </div>
          </div>
          {config.transformResponse && (
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => setShowResponseMapping(!showResponseMapping)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">{showResponseMapping ? 'expand_less' : 'edit_note'}</span>
                {showResponseMapping ? 'Close Response Mapping' : 'Edit Response Mapping'}
              </button>
              {showResponseMapping && (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.02] px-3 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-text-muted">Response Transform Rules</p>
                  <p className="text-[10px] text-text-muted">Define how the target response should be transformed before storing or forwarding.</p>
                  <textarea
                    className="w-full rounded-md border border-border-soft bg-white px-3 py-2 text-[12px] font-mono text-text-main placeholder:text-text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
                    rows={5}
                    placeholder={'{\n  "mappings": [\n    { "source": "$.response.id", "target": "$.result.recordId" }\n  ]\n}'}
                    value={config.responseTransformRules ?? ''}
                    onChange={(e) => set('responseTransformRules', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. OUTPUT TO SOURCE ─────────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="Output to source system" subtitle="How should the response be sent back to the requesting system?" />

        <div className="space-y-2">
          <RadioOption label="Send automatically if source expects a response" selected={config.outputToSource === 'auto_if_expected'} onSelect={() => set('outputToSource', 'auto_if_expected')} />
          <RadioOption label="Do not send a response" selected={config.outputToSource === 'no_response'} onSelect={() => set('outputToSource', 'no_response')} />
        </div>
      </div>

      {/* ── 3. NOTIFY ANOTHER SYSTEM ──────────────────────────── */}
      <div className="rounded-xl border border-border-soft bg-white/60 px-4 py-4 space-y-4">
        <SectionHeader title="Notify another system" subtitle="Send a notification to an external endpoint after execution" />

        <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
          <CheckboxField label="Enable notification" checked={config.notificationEnabled} onChange={(v) => set('notificationEnabled', v)} />
        </div>

        {config.notificationEnabled && (
          <div className="space-y-3 pl-1">
            <div>
              <p className="text-[11px] font-semibold text-text-muted mb-2">Trigger on</p>
              <div className="flex gap-4">
                <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
                  <CheckboxField label="On success" checked={config.notificationOnSuccess} onChange={(v) => set('notificationOnSuccess', v)} />
                </div>
                <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2">
                  <CheckboxField label="On failure" checked={config.notificationOnFailure} onChange={(v) => set('notificationOnFailure', v)} />
                </div>
              </div>
            </div>

            <TextField label="Destination URL" value={config.notificationDestinationUrl} placeholder="https://example.com/webhook" onChange={(v) => set('notificationDestinationUrl', v)} />

            <SelectField label="Method" value={config.notificationMethod} options={['POST', 'PUT']} onChange={(v) => set('notificationMethod', v as ResponseHandlingConfig['notificationMethod'])} />

            <div>
              <p className="text-[11px] font-semibold text-text-muted mb-2">Payload</p>
              <div className="space-y-2">
                <RadioOption label="Standard response" selected={config.notificationPayloadMode === 'standard_response'} onSelect={() => set('notificationPayloadMode', 'standard_response')} />
                <RadioOption label="Custom payload" selected={config.notificationPayloadMode === 'custom_payload'} onSelect={() => set('notificationPayloadMode', 'custom_payload')}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowNotificationMapping(!showNotificationMapping); }}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px]">{showNotificationMapping ? 'expand_less' : 'edit_note'}</span>
                    {showNotificationMapping ? 'Close' : 'Edit Notification Mapping'}
                  </button>
                </RadioOption>
              </div>
              {config.notificationPayloadMode === 'custom_payload' && showNotificationMapping && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/[0.02] px-3 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-text-muted">Custom Notification Payload</p>
                  <p className="text-[10px] text-text-muted">Define the JSON template sent to the notification destination. Use placeholders like <code className="text-[10px] bg-slate-100 px-1 rounded">{'{{status}}'}</code>, <code className="text-[10px] bg-slate-100 px-1 rounded">{'{{integrationId}}'}</code>.</p>
                  <textarea
                    className="w-full rounded-md border border-border-soft bg-white px-3 py-2 text-[12px] font-mono text-text-main placeholder:text-text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
                    rows={5}
                    placeholder={'{\n  "status": "{{status}}",\n  "integrationId": "{{integrationId}}",\n  "timestamp": "{{timestamp}}"\n}'}
                    value={config.notificationCustomPayload ?? ''}
                    onChange={(e) => set('notificationCustomPayload', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. ADVANCED CONTROLS (collapsed) ──────────────────── */}
      <CollapsibleSection title="Advanced Controls" icon="tune">
        <div className="space-y-2">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
            <CheckboxField label="Convert technical errors to business messages" checked={config.businessErrorTranslationEnabled} onChange={(v) => set('businessErrorTranslationEnabled', v)} />
          </div>
          {config.businessErrorTranslationEnabled && (
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Edit Error Mapping
            </button>
          )}
        </div>

        <SelectField label="Logging Level" value={config.loggingLevel} options={['Minimal', 'Standard', 'Verbose']} onChange={(v) => set('loggingLevel', v as ResponseHandlingConfig['loggingLevel'])} />

        <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
          <CheckboxField label="Enable detailed diagnostics" checked={config.debugMode} onChange={(v) => set('debugMode', v)} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
