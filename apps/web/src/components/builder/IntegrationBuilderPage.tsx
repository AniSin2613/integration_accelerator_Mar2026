'use client';

import { useState, useCallback, type ReactNode } from 'react';
import {
  type BuilderState,
  type BuilderStepId,
  type StepMeta,
  isTriggerComplete,
  isSourceComplete,
  isMappingComplete,
  isValidationComplete,
  isTargetComplete,
  isResponseHandlingComplete,
  isMonitoringComplete,
  getSourceTargetWarning,
} from './types';
import { createDemoBuilderState } from './mockData';
import { BuilderTopBar } from './BuilderTopBar';
import { BuilderOutlineRail } from '@/components/ui/BuilderOutlineRail';
import { WorkflowStage } from '@/components/ui/WorkflowStage';
import { StoryboardCanvas } from './StoryboardCanvas';
import { BuilderWorkbench } from '@/components/ui/BuilderWorkbench';
import { type WorkbenchTabId } from '@/components/ui/WorkbenchTabs';
import { StepOutputPanel } from '@/components/ui/StepOutputPanel';
import { TriggerWorkbench } from './workbench/TriggerWorkbench';
import { SourceGroupWorkbench } from './workbench/SourceGroupWorkbench';
import { MappingWorkbench } from './workbench/MappingWorkbench';
import { ValidationWorkbench } from './workbench/ValidationWorkbench';
import { TargetGroupWorkbench } from './workbench/TargetGroupWorkbench';
import { ResponseHandlingWorkbench } from './workbench/ResponseHandlingWorkbench';
import { MonitoringWorkbench } from './workbench/MonitoringWorkbench';

const STEP_WB_META: Record<BuilderStepId, { icon: string; iconBg: string; subtitle: string }> = {
  trigger: { icon: 'bolt', iconBg: 'bg-amber-50 text-amber-600', subtitle: 'Define schedule, webhook, or manual trigger contract' },
  sourceGroup: { icon: 'cloud_download', iconBg: 'bg-emerald-50 text-emerald-600', subtitle: 'Configure one or more source systems' },
  mapping: { icon: 'schema', iconBg: 'bg-violet-50 text-violet-600', subtitle: 'Define canonical mapping and transformations' },
  validation: { icon: 'rule', iconBg: 'bg-rose-50 text-rose-600', subtitle: 'Enforce policy and data quality rules' },
  targetGroup: { icon: 'cloud_upload', iconBg: 'bg-sky-50 text-sky-600', subtitle: 'Configure one or more target systems' },
  responseHandling: { icon: 'reply', iconBg: 'bg-indigo-50 text-indigo-600', subtitle: 'Configure response handling and callbacks' },
  operations: { icon: 'monitoring', iconBg: 'bg-slate-100 text-slate-600', subtitle: 'Monitoring, retry, alerts, DLQ, and diagnostics policy' },
};

const STEP_LABELS: Record<BuilderStepId, string> = {
  trigger: 'Trigger',
  sourceGroup: 'Source',
  mapping: 'Mapping',
  validation: 'Validation',
  targetGroup: 'Target',
  responseHandling: 'Response',
  operations: 'Monitoring & Ops',
};

function recomputeSteps(state: BuilderState): StepMeta[] {
  return state.steps.map((s) => {
    let status = s.status;
    switch (s.id) {
      case 'trigger':
        status = isTriggerComplete(state.trigger) ? 'complete' : 'not-started';
        break;
      case 'sourceGroup':
        status = isSourceComplete(state.sourceGroup)
          ? 'complete'
          : state.sourceGroup.primary.connectionId
            ? 'in-progress'
            : 'not-started';
        break;
      case 'mapping':
        status = isMappingComplete(state.mapping)
          ? 'complete'
          : state.mapping.mappings.length
            ? 'warning'
            : 'not-started';
        break;
      case 'validation':
        status = isValidationComplete(state.validation)
          ? 'complete'
          : state.validation.rules.length
            ? 'in-progress'
            : 'not-started';
        break;
      case 'targetGroup':
        status = isTargetComplete(state.targetGroup)
          ? 'complete'
          : state.targetGroup.targets.length
            ? 'in-progress'
            : 'not-started';
        break;
      case 'responseHandling':
        status = isResponseHandlingComplete(state.responseHandling)
          ? 'complete'
          : state.responseHandling.businessResponseMappingEnabled || state.responseHandling.callbackEnabled
            ? 'in-progress'
            : 'not-started';
        break;
      case 'operations':
        status = isMonitoringComplete(state.operations) ? 'complete' : 'not-started';
        break;
    }
    return { ...s, status };
  });
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-text-muted">{children}</span>;
}

function useStepSummary(state: BuilderState, step: BuilderStepId): ReactNode {
  switch (step) {
    case 'trigger':
      return <Chip>{state.trigger.triggerType}</Chip>;
    case 'sourceGroup':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.sourceGroup.primary.connectionName || 'No primary source'}</Chip>
          <Chip>{state.sourceGroup.enrichmentSources.length} enrichment</Chip>
          <Chip>{state.sourceGroup.processingPattern}</Chip>
        </div>
      );
    case 'mapping':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.mapping.mappings.length} mapped</Chip>
          <Chip>{state.mapping.unmappedTargetFields.length} unmapped canonical</Chip>
        </div>
      );
    case 'validation':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.validation.rules.length} rules</Chip>
          <Chip>{state.validation.policyMode}</Chip>
        </div>
      );
    case 'targetGroup':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.targetGroup.targets[0]?.connectionName || 'No primary target'}</Chip>
          <Chip>+{Math.max(0, state.targetGroup.targets.length - 1)} additional</Chip>
          <Chip>{state.targetGroup.deliveryPattern}</Chip>
        </div>
      );
    case 'responseHandling':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.responseHandling.successPolicy}</Chip>
          <Chip>{state.responseHandling.callbackEnabled ? 'Callback enabled' : 'No callback'}</Chip>
        </div>
      );
    case 'operations':
      return (
        <div className="flex items-center gap-1.5">
          <Chip>{state.operations.alertChannel} alerts</Chip>
          <Chip>{state.operations.diagnosticsLevel} diagnostics</Chip>
        </div>
      );
    default:
      return null;
  }
}

function StepValidationPanel({ step, state }: { step: BuilderStepId; state: BuilderState }) {
  const stWarning = getSourceTargetWarning(state);
  return (
    <div className="p-4 space-y-2">
      <p className="text-[12px] font-semibold text-text-main">Validation checks for {STEP_LABELS[step]}</p>
      <ul className="text-[12px] text-text-muted space-y-1">
        {step === 'mapping' && <li>Unmapped required canonical fields: {state.mapping.unmappedTargetFields.length}</li>}
        {step === 'sourceGroup' && <li>Primary source configured: {state.sourceGroup.primary.connectionId ? 'Yes' : 'No'}</li>}
        {step === 'targetGroup' && <li>Target/source collision check: {stWarning === 'block' ? 'Blocked' : stWarning === 'warn' ? 'Warning' : 'Pass'}</li>}
        {step === 'responseHandling' && <li>Error mapping policy configured: {state.responseHandling.errorPolicy ? 'Yes' : 'No'}</li>}
        <li>Security: payload previews are redacted by classification and environment policy.</li>
      </ul>
    </div>
  );
}

function StepTestPanel({ step }: { step: BuilderStepId }) {
  return (
    <div className="p-4">
      <p className="text-[12px] font-semibold text-text-main">Latest test results for {STEP_LABELS[step]}</p>
      <p className="mt-1 text-[12px] text-text-muted">No live execution bound yet in this UI slice. This tab is reserved for step-level execution logs and diagnostics outcomes.</p>
    </div>
  );
}

interface IntegrationBuilderPageProps {
  integrationId: string;
}

export default function IntegrationBuilderPage({ integrationId }: IntegrationBuilderPageProps) {
  const [state, setState] = useState<BuilderState>(() => createDemoBuilderState(integrationId));
  const [workbenchExpanded, setWorkbenchExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkbenchTabId>('design');
  const [diagnosticsState, setDiagnosticsState] = useState<'summary' | 'expanded'>('summary');

  const update = useCallback((patch: Partial<BuilderState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch, isDirty: true };
      next.steps = recomputeSteps(next);
      return next;
    });
  }, []);

  const selectStep = useCallback((id: BuilderStepId) => {
    setState((prev) => {
      const next = { ...prev, activeStep: id };
      next.steps = recomputeSteps(next);
      return next;
    });
    setWorkbenchExpanded(true);
    setActiveTab('design');
  }, []);

  const handleSave = useCallback(() => {
    setState((prev) => ({ ...prev, isSaving: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, isSaving: false, isDirty: false, lastSavedAt: new Date().toISOString() }));
    }, 800);
  }, []);

  const noop = useCallback(() => {}, []);
  const stWarning = getSourceTargetWarning(state);
  const activeStep = state.activeStep;
  const meta = STEP_WB_META[activeStep];
  const summary = useStepSummary(state, activeStep);
  const completedCount = state.steps.filter((step) => step.status === 'complete').length;

  return (
    <div className="flex h-screen flex-col bg-slate-100/50 overflow-hidden">
      {/* ── Fixed top bar ── */}
      <BuilderTopBar
        integrationName={state.integrationName}
        templateLabel={state.templateLabel}
        versionLabel={state.versionLabel}
        validationStatus={state.validationStatus}
        environment={state.environment}
        isDirty={state.isDirty}
        isSaving={state.isSaving}
        lastSavedAt={state.lastSavedAt}
        onSaveDraft={handleSave}
        onValidate={noop}
        onTest={noop}
      />

      {/* ── Flex-grow studio body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left outline rail: compact nav + progress */}
        <BuilderOutlineRail steps={state.steps} activeStep={activeStep} onSelectStep={selectStep} />

        {/* Main studio: workflow + workbench */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Storyboard stage: responsive but bounded */}
          <WorkflowStage>
            <StoryboardCanvas state={state} activeStep={activeStep} onSelectStep={selectStep} />
          </WorkflowStage>

          {/* Warning banner if needed */}
          {stWarning !== 'none' && (
            <div className={`flex-none px-5 py-2 text-[12px] font-medium flex items-center gap-2 ${
              stWarning === 'block' ? 'bg-danger-bg text-danger-text' : 'bg-warning-bg text-warning-text'
            }`}>
              <span className="material-symbols-outlined text-[16px]">{stWarning === 'block' ? 'block' : 'warning'}</span>
              {stWarning === 'block'
                ? 'Source and primary target share identical interface and method. This is blocked.'
                : 'Source and primary target use same connection; verify interface separation.'}
            </div>
          )}

          {/* Workbench: flex to fill remaining space */}
          <BuilderWorkbench
            icon={meta.icon}
            iconBg={meta.iconBg}
            title={STEP_LABELS[activeStep]}
            subtitle={meta.subtitle}
            stepIndex={state.steps.findIndex((s) => s.id === activeStep) + 1}
            totalSteps={state.steps.length}
            expanded={workbenchExpanded}
            onToggle={() => setWorkbenchExpanded((e) => !e)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            summary={summary}
          >
            {activeTab === 'design' && activeStep === 'trigger' && (
              <TriggerWorkbench config={state.trigger} onChange={(trigger) => update({ trigger })} />
            )}
            {activeTab === 'design' && activeStep === 'sourceGroup' && (
              <SourceGroupWorkbench
                config={state.sourceGroup}
                onChange={(sourceGroup) => update({ sourceGroup })}
              />
            )}
            {activeTab === 'design' && activeStep === 'mapping' && (
              <MappingWorkbench
                config={state.mapping}
                onChange={(mapping) => update({ mapping })}
                selectedMappingId={state.selectedMappingId}
                onSelectMapping={(id) => setState((p) => ({ ...p, selectedMappingId: id }))}
              />
            )}
            {activeTab === 'design' && activeStep === 'validation' && (
              <ValidationWorkbench
                config={state.validation}
                onChange={(validation) => update({ validation })}
                selectedRuleId={state.selectedRuleId}
                onSelectRule={(id) => setState((p) => ({ ...p, selectedRuleId: id }))}
              />
            )}
            {activeTab === 'design' && activeStep === 'targetGroup' && (
              <TargetGroupWorkbench
                config={state.targetGroup}
                onChange={(targetGroup) => update({ targetGroup })}
              />
            )}
            {activeTab === 'design' && activeStep === 'responseHandling' && (
              <ResponseHandlingWorkbench config={state.responseHandling} onChange={(responseHandling) => update({ responseHandling })} />
            )}
            {activeTab === 'design' && activeStep === 'operations' && (
              <MonitoringWorkbench config={state.operations} onChange={(operations) => update({ operations })} />
            )}

            {activeTab === 'output' && (
              <StepOutputPanel title={`${STEP_LABELS[activeStep]} Output`} status="Preview" timing="142ms" errorCount={0} displayMode="expanded" />
            )}
            {activeTab === 'validation' && <StepValidationPanel step={activeStep} state={state} />}
            {activeTab === 'test' && <StepTestPanel step={activeStep} />}
          </BuilderWorkbench>
        </div>
      </div>

      <div className="flex flex-none items-stretch border-t border-slate-300/90 bg-slate-200/72 shadow-[0_-10px_24px_-18px_rgba(15,23,42,0.42)] backdrop-blur-sm">
        <div className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-1 border-r border-slate-300/90 px-2 py-2.5 text-center">
          <div className="h-1 w-full max-w-[42px] overflow-hidden rounded-full bg-slate-300/80">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round((completedCount / state.steps.length) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            {completedCount}/{state.steps.length}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <StepOutputPanel
            title="Diagnostics"
            status="Ready"
            timing="N/A"
            errorCount={0}
            displayMode={diagnosticsState}
            onToggleState={() => {
              setDiagnosticsState((prev) => (prev === 'summary' ? 'expanded' : 'summary'));
            }}
          />
        </div>
      </div>
    </div>
  );
}
