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
    <div className="p-5 pb-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Alerting */}
        <WorkbenchSection label="Alerting">
          <div className="space-y-3">
            <SelectField label="Alert Channel" value={config.alertChannel} options={ALERT_CHANNELS} onChange={(v) => set('alertChannel', v)} />
            {config.alertChannel !== 'None' && (
              <TextField
                label={config.alertChannel === 'Email' ? 'Email Address' : config.alertChannel === 'Slack' ? 'Slack Channel' : 'Webhook URL'}
                placeholder={config.alertChannel === 'Email' ? 'ops@company.com' : config.alertChannel === 'Slack' ? '#ap-ops-alerts' : 'https://hooks.slack.com/...'}
                value={config.alertDestination}
                onChange={(v) => set('alertDestination', v)}
              />
            )}
            <NumberField label="Error Threshold (%)" value={config.errorThresholdPercent} min={0} max={100} onChange={(v) => set('errorThresholdPercent', v)} />
          </div>
        </WorkbenchSection>

        {/* Retry */}
        <WorkbenchSection label="Retry Policy">
          <div className="space-y-3">
            <CheckboxField label="Enable automatic retry" checked={config.enableRetry} onChange={(v) => set('enableRetry', v)} />
            {config.enableRetry && (
              <>
                <NumberField label="Max Retries" value={config.maxRetries} min={1} max={10} onChange={(v) => set('maxRetries', v)} />
                <NumberField label="Retry Delay (ms)" value={config.retryDelayMs} min={100} max={60000} onChange={(v) => set('retryDelayMs', v)} />
              </>
            )}
          </div>
        </WorkbenchSection>

        {/* Dead Letter */}
        <WorkbenchSection label="Exception Queue">
          <div className="space-y-3">
            <CheckboxField label="Enable dead letter queue" checked={config.deadLetterEnabled} onChange={(v) => set('deadLetterEnabled', v)} />
            {config.deadLetterEnabled && (
              <TextField label="DLQ Topic" placeholder="invoice-sync-dlq" value={config.deadLetterTopic} onChange={(v) => set('deadLetterTopic', v)} />
            )}
          </div>
        </WorkbenchSection>
      </div>
    </div>
  );
}
