'use client';

import { TextField, SelectField, NumberField, CheckboxField } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type MonitoringConfig, type AlertChannel } from '../types';

/* ------------------------------------------------------------------ */
/*  MonitoringWorkbench – bottom panel for monitoring & exceptions      */
/* ------------------------------------------------------------------ */

const ALERT_CHANNELS: AlertChannel[] = ['None', 'Email', 'Slack', 'Webhook'];

interface MonitoringWorkbenchProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
}

export function MonitoringWorkbench({ config, onChange }: MonitoringWorkbenchProps) {
  const set = <K extends keyof MonitoringConfig>(key: K, value: MonitoringConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="p-4 space-y-5 pb-6">
      <WorkbenchSection label="Alerting">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Alert Channel" value={config.alertChannel} options={ALERT_CHANNELS} onChange={(v) => set('alertChannel', v)} />
          <NumberField label="Error Threshold (%)" value={config.errorThresholdPercent} min={0} max={100} onChange={(v) => set('errorThresholdPercent', v)} />
          {config.alertChannel !== 'None' && (
            <div className="col-span-2">
              <TextField
                label={config.alertChannel === 'Email' ? 'Email Address' : config.alertChannel === 'Slack' ? 'Slack Channel' : 'Webhook URL'}
                placeholder={config.alertChannel === 'Email' ? 'ops@company.com' : config.alertChannel === 'Slack' ? '#ap-ops-alerts' : 'https://hooks.slack.com/...'}
                value={config.alertDestination}
                onChange={(v) => set('alertDestination', v)}
              />
            </div>
          )}
        </div>
      </WorkbenchSection>

      <WorkbenchSection label="Retry Policy">
        <div className="space-y-3">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
            <CheckboxField label="Enable automatic retry" checked={config.enableRetry} onChange={(v) => set('enableRetry', v)} />
          </div>
          {config.enableRetry && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Max Retries" value={config.maxRetries} min={1} max={10} onChange={(v) => set('maxRetries', v)} />
              <NumberField label="Retry Delay (ms)" value={config.retryDelayMs} min={100} max={60000} onChange={(v) => set('retryDelayMs', v)} />
            </div>
          )}
        </div>
      </WorkbenchSection>

      <WorkbenchSection label="Exception Queue">
        <div className="space-y-3">
          <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
            <CheckboxField label="Enable dead letter queue" checked={config.deadLetterEnabled} onChange={(v) => set('deadLetterEnabled', v)} />
          </div>
          {config.deadLetterEnabled && (
            <TextField label="DLQ Topic" placeholder="invoice-sync-dlq" value={config.deadLetterTopic} onChange={(v) => set('deadLetterTopic', v)} />
          )}
        </div>
      </WorkbenchSection>
    </div>
  );
}
