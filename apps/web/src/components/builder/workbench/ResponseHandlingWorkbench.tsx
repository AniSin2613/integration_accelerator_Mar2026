'use client';

import { TextField, SelectField, CheckboxField } from '@/components/ui/FormFields';
import { WorkbenchSection } from '@/components/ui/BuilderWorkbench';
import { type ResponseHandlingConfig } from '../types';

interface ResponseHandlingWorkbenchProps {
  config: ResponseHandlingConfig;
  onChange: (config: ResponseHandlingConfig) => void;
}

export function ResponseHandlingWorkbench({ config, onChange }: ResponseHandlingWorkbenchProps) {
  const set = <K extends keyof ResponseHandlingConfig>(key: K, value: ResponseHandlingConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="p-4 space-y-5 pb-6">
      <div className="grid grid-cols-2 gap-5">
        <WorkbenchSection label="Success Response Handling">
          <div className="space-y-3">
            <SelectField label="Success Criteria" value={config.successPolicy} options={['2xx only', '2xx + business ack']} onChange={(v) => set('successPolicy', v as ResponseHandlingConfig['successPolicy'])} />
            <CheckboxField label="Business response mapping enabled" checked={config.businessResponseMappingEnabled} onChange={(v) => set('businessResponseMappingEnabled', v)} />
          </div>
        </WorkbenchSection>

        <WorkbenchSection label="Error Response Handling">
          <div className="space-y-3">
            <SelectField label="Error Policy" value={config.errorPolicy} options={['Normalize & Route', 'Pass-through']} onChange={(v) => set('errorPolicy', v as ResponseHandlingConfig['errorPolicy'])} />
            <SelectField label="Partial Success Policy" value={config.partialSuccessPolicy} options={['All-or-nothing', 'Partial success allowed', 'Compensate failed targets']} onChange={(v) => set('partialSuccessPolicy', v as ResponseHandlingConfig['partialSuccessPolicy'])} />
          </div>
        </WorkbenchSection>
      </div>

      <WorkbenchSection label="Callback / Writeback">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <CheckboxField label="Enable callback" checked={config.callbackEnabled} onChange={(v) => set('callbackEnabled', v)} />
          </div>
          <TextField label="Callback Destination" value={config.callbackDestination} placeholder="https://source.example.com/ack" onChange={(v) => set('callbackDestination', v)} />
          <SelectField label="Callback Method" value={config.callbackMethod} options={['POST', 'PUT']} onChange={(v) => set('callbackMethod', v as ResponseHandlingConfig['callbackMethod'])} />
        </div>
        <p className="mt-2 text-[11px] text-text-muted">Callback destinations are policy-gated. Signing secrets are never shown in clear text.</p>
      </WorkbenchSection>
    </div>
  );
}
