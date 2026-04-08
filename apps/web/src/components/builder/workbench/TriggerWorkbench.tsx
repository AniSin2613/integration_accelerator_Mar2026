'use client';

import { TextField, SelectField, TextAreaField, WORKBENCH_OPTION_ACTIVE, WORKBENCH_OPTION_BASE, WORKBENCH_OPTION_INACTIVE } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type TriggerConfig, type TriggerType } from '../types';

/* ------------------------------------------------------------------ */
/*  TriggerWorkbench – bottom panel for trigger configuration          */
/* ------------------------------------------------------------------ */

const TRIGGER_TYPES: TriggerType[] = ['Schedule / Cron', 'Webhook', 'Manual'];

interface TriggerWorkbenchProps {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function TriggerWorkbench({ config, onChange }: TriggerWorkbenchProps) {
  const set = <K extends keyof TriggerConfig>(key: K, value: TriggerConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="p-4 space-y-5 pb-6">
      <WorkbenchSection label="Trigger Type">
        <div className="grid grid-cols-3 gap-3">
          {TRIGGER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('triggerType', t)}
              className={`flex flex-col ${WORKBENCH_OPTION_BASE} ${
                config.triggerType === t
                  ? WORKBENCH_OPTION_ACTIVE
                  : WORKBENCH_OPTION_INACTIVE
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {t === 'Schedule / Cron' ? 'schedule' : t === 'Webhook' ? 'webhook' : 'touch_app'}
              </span>
              <span className="text-center leading-tight">{t}</span>
            </button>
          ))}
        </div>
      </WorkbenchSection>

      {config.triggerType === 'Schedule / Cron' && (
        <div className="grid grid-cols-2 gap-5">
          <WorkbenchSection label="Schedule">
            <TextField
              label="Cron Expression"
              placeholder="0 */15 * * *"
              value={config.cronExpression}
              onChange={(v) => set('cronExpression', v)}
            />
            {config.cronExpression && (
              <p className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">info</span>
                Preview: runs every interval defined by cron
              </p>
            )}
          </WorkbenchSection>
          <WorkbenchSection label="Notes">
            <TextAreaField
              label="Description"
              placeholder="Describe what triggers this integration…"
              value={config.description}
              onChange={(v) => set('description', v)}
              rows={3}
            />
          </WorkbenchSection>
        </div>
      )}

      {config.triggerType === 'Webhook' && (
        <div className="grid grid-cols-2 gap-5">
          <WorkbenchSection label="Webhook Configuration">
            <TextField
              label="Webhook Path"
              placeholder="/webhooks/invoice-sync"
              value={config.webhookPath}
              onChange={(v) => set('webhookPath', v)}
            />
          </WorkbenchSection>
          <WorkbenchSection label="Notes">
            <TextAreaField
              label="Description"
              placeholder="Describe this webhook trigger…"
              value={config.description}
              onChange={(v) => set('description', v)}
              rows={3}
            />
          </WorkbenchSection>
        </div>
      )}

      {config.triggerType === 'Manual' && (
        <WorkbenchSection label="Manual Execution">
          <div className="rounded-lg border border-border-soft bg-background-light px-4 py-3">
            <p className="text-[13px] text-text-main font-medium">Manual trigger enabled</p>
            <p className="text-[12px] text-text-muted mt-0.5">This integration will only run when manually triggered.</p>
          </div>
          <div className="pt-2">
            <TextAreaField
              label="Description"
              placeholder="Describe when this should be manually triggered…"
              value={config.description}
              onChange={(v) => set('description', v)}
              rows={2}
            />
          </div>
        </WorkbenchSection>
      )}
    </div>
  );
}
