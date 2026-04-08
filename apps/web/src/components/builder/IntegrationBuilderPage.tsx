'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
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
import { createDemoBuilderState, createBlankBuilderState, DEFAULT_STEPS } from './mockData';
import { BuilderTopBar } from './BuilderTopBar';
import { StoryboardCanvas } from './StoryboardCanvas';
import { WorkbenchTabs, type WorkbenchTabId } from '@/components/ui/WorkbenchTabs';
import { StepOutputPanel } from '@/components/ui/StepOutputPanel';
import { TriggerWorkbench } from './workbench/TriggerWorkbench';
import { SourceGroupWorkbench } from './workbench/SourceGroupWorkbench';
import { MappingStudioSummaryCard } from '@/components/mapping-studio/MappingStudioSummaryCard';
import { ValidationWorkbench } from './workbench/ValidationWorkbench';
import { TargetGroupWorkbench } from './workbench/TargetGroupWorkbench';
import { ResponseHandlingWorkbench } from './workbench/ResponseHandlingWorkbench';
import { MonitoringWorkbench } from './workbench/MonitoringWorkbench';
import { IntegrationReadinessBadge, ReadyForReviewButton } from './ReadinessComponents';
import { ProfileUpdateStatusBadge } from '@/components/ui/ProfileUpdateStatusBadge';
import { WorkflowNodeIcon } from '@/components/ui/WorkflowNodeIcon';
import { getWorkflowNodeIconByKey } from '@/lib/workflow-node-icons';

import type { ValidationConfig, ValidationRule, ValidationSeverity, ValidationOperator, ValidationRuleSource, ValidationErrorConfig } from './types';
import { DEFAULT_ERROR_CONFIG } from './types';

const STEP_WB_META: Record<BuilderStepId, { icon: ReturnType<typeof getWorkflowNodeIconByKey>; iconBg: string; subtitle: string }> = {
  trigger: { icon: getWorkflowNodeIconByKey('trigger'), iconBg: 'bg-amber-50 text-amber-600', subtitle: 'Define schedule, webhook, or manual trigger contract' },
  sourceGroup: { icon: getWorkflowNodeIconByKey('sourceGroup'), iconBg: 'bg-emerald-50 text-emerald-600', subtitle: 'Configure one or more source systems' },
  mapping: { icon: getWorkflowNodeIconByKey('mapping'), iconBg: 'bg-ai-bg text-ai', subtitle: 'Define canonical mapping and transformations' },
  validation: { icon: getWorkflowNodeIconByKey('validation'), iconBg: 'bg-rose-50 text-rose-600', subtitle: 'Enforce policy and data quality rules' },
  targetGroup: { icon: getWorkflowNodeIconByKey('targetGroup'), iconBg: 'bg-sky-50 text-sky-600', subtitle: 'Configure one or more target systems' },
  responseHandling: { icon: getWorkflowNodeIconByKey('responseHandling'), iconBg: 'bg-indigo-50 text-indigo-600', subtitle: 'Configure response handling and callbacks' },
  operations: { icon: getWorkflowNodeIconByKey('operations'), iconBg: 'bg-slate-100 text-slate-600', subtitle: 'Monitoring, retry, alerts, DLQ, and diagnostics policy' },
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

function normalizeSeverity(raw: string | undefined): ValidationSeverity {
  const s = (raw ?? '').toLowerCase();
  if (s === 'error') return 'Error';
  if (s === 'warning') return 'Warning';
  if (s === 'info') return 'Info';
  return 'Error';
}

function normalizeOperator(raw: string | undefined): ValidationOperator {
  const valid: ValidationOperator[] = ['IS_NOT_EMPTY', 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN', 'MATCHES', 'LENGTH_MIN', 'LENGTH_MAX'];
  if (raw && valid.includes(raw as ValidationOperator)) return raw as ValidationOperator;
  // Legacy: map old type names to operators
  if (raw === 'REQUIRED') return 'IS_NOT_EMPTY';
  if (raw === 'NUMERIC_RANGE') return 'GREATER_THAN';
  if (raw === 'ALLOWED_VALUES') return 'IN';
  return 'IS_NOT_EMPTY';
}

function normalizeValidationConfig(raw: any): ValidationConfig {
  if (!raw || typeof raw !== 'object') return { rules: [], policyMode: 'Balanced', errorConfig: { ...DEFAULT_ERROR_CONFIG } };
  const rules: ValidationRule[] = Array.isArray(raw.rules)
    ? raw.rules.map((r: any) => ({
        id: r.id ?? `vr${Date.now()}`,
        name: r.name ?? r.label ?? '',
        field: r.field ?? '',
        operator: normalizeOperator(r.operator ?? r.type),
        value: r.value ?? (r.config?.values ? r.config.values : r.config?.min != null ? String(r.config.min) : ''),
        severity: normalizeSeverity(r.severity),
        enabled: r.enabled ?? true,
        source: (r.source as ValidationRuleSource) ?? 'manual',
      }))
    : [];
  const policyMode = raw.policyMode === 'Strict' || raw.policyMode === 'Lenient' ? raw.policyMode : 'Balanced';
  const errorConfig: ValidationErrorConfig = raw.errorConfig && typeof raw.errorConfig === 'object'
    ? {
        logEnabled: raw.errorConfig.logEnabled ?? DEFAULT_ERROR_CONFIG.logEnabled,
        dlqEnabled: raw.errorConfig.dlqEnabled ?? DEFAULT_ERROR_CONFIG.dlqEnabled,
        dlqTopic: raw.errorConfig.dlqTopic ?? DEFAULT_ERROR_CONFIG.dlqTopic,
        notifyChannel: raw.errorConfig.notifyChannel ?? DEFAULT_ERROR_CONFIG.notifyChannel,
        notifyRecipients: raw.errorConfig.notifyRecipients ?? DEFAULT_ERROR_CONFIG.notifyRecipients,
        includeRecordData: raw.errorConfig.includeRecordData ?? DEFAULT_ERROR_CONFIG.includeRecordData,
      }
    : { ...DEFAULT_ERROR_CONFIG };
  return { rules, policyMode, errorConfig };
}

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

function StageStatusBadge({ value }: { value?: string }) {
  const v = value ?? 'N/A';
  const color = v === 'SUCCESS' ? 'text-emerald-700' : v === 'PARTIAL' ? 'text-amber-700' : v === 'FAILED' ? 'text-rose-700' : v === 'SKIPPED' ? 'text-slate-400' : 'text-text-main';
  return <span className={`font-medium ${color}`}>{v}</span>;
}

interface E2ETestResult {
  testRunId?: string;
  status: string;
  summary: string;
  errors: string[];
  warnings?: string[];
  recordCounts?: { total: number; passed: number; failed: number };
  context: Record<string, unknown>;
  stages?: {
    sourceFetchStatus?: string;
    mappingStatus?: string;
    validationStatus?: string;
    targetDeliveryStatus?: string;
  };
  payloads?: {
    source?: unknown;
    outboundJson?: unknown;
    passedJson?: unknown;
    failedJson?: Array<{ record: Record<string, unknown>; errors: string[] }>;
    outboundRaw?: string | null;
  };
  targetResponse?: {
    statusCode?: number | null;
    body?: string | null;
    headers?: Record<string, string>;
    targetType?: 'JSON' | 'XML';
    targetName?: string;
  };
  driftSuggestionsCreated?: number;
}

function StepTestPanel({ step, state, integrationId }: { step: BuilderStepId; state: BuilderState; integrationId: string }) {
  const [testResult, setTestResult] = useState<E2ETestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [targetMode, setTargetMode] = useState<'success' | 'error'>('success');

  const profile = state.targetGroup.targetProfileState;
  const primaryTarget = state.targetGroup.targets[0];
  const computedTargetType: 'JSON' | 'XML' =
    (primaryTarget?.operation ?? '').toUpperCase().includes('XML') ||
    (primaryTarget?.endpointPath ?? '').toLowerCase().includes('.xml')
      ? 'XML'
      : 'JSON';
  const computedTargetName = primaryTarget?.name || primaryTarget?.connectionName || 'demo-target';

  const prettyJson = (value: unknown) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const downloadJson = (data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const runE2ETest = async () => {
    setRunning(true);
    setTestResult(null);
    try {
      const { api } = await import('@/lib/api-client');
      const startResult = await api.post<{ testRunId: string; status: string }>(
        `/integrations/${integrationId}/test-run`,
        {
          dryRun: false,
          step,
          targetType: computedTargetType,
          targetName: computedTargetName,
          targetMode,
        },
      );

      const testRunId = startResult.testRunId;
      if (!testRunId) throw new Error('No testRunId returned');

      // Show initial running state with stage info
      setTestResult({ testRunId, status: 'running', summary: 'Test run in progress…', errors: [], context: {} });

      // Poll for completion
      const poll = async (): Promise<E2ETestResult> => {
        const result = await api.get<E2ETestResult>(
          `/integrations/${integrationId}/test-run/${testRunId}`,
        );
        if (result.status === 'running') {
          setTestResult(result);
          await new Promise((r) => setTimeout(r, 3000));
          return poll();
        }
        return result;
      };

      const finalResult = await poll();
      setTestResult(finalResult);
    } catch (err) {
      setTestResult({ status: 'error', summary: err instanceof Error ? err.message : 'Test failed', errors: [String(err)], context: {} });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-text-main">Test — {STEP_LABELS[step]}</p>
        <button
          type="button"
          onClick={runE2ETest}
          disabled={running}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">{running ? 'hourglass_empty' : 'play_arrow'}</span>
          {running ? 'Running…' : 'Run End-to-End Test'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-soft bg-slate-50/80 px-3 py-2">
        <div className="text-[11px] text-text-muted">
          Target type: <span className="font-semibold text-text-main">{computedTargetType}</span>
        </div>
        <div className="text-[11px] text-text-muted">
          Target name: <span className="font-semibold text-text-main">{computedTargetName}</span>
        </div>
        <label className="inline-flex items-center gap-1 text-[11px] text-text-muted">
          Mode
          <select
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value as 'success' | 'error')}
            className="rounded border border-border-soft bg-white px-2 py-1 text-[11px] text-text-main"
          >
            <option value="success">success</option>
            <option value="error">error</option>
          </select>
        </label>
        <Link
          href={`/integrations/${integrationId}/demo-targets`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[13px]">receipt_long</span>
          Open receipts
        </Link>
      </div>

      {/* Effective Schema Context */}
      {profile && (
        <div className="rounded-lg border border-border-soft bg-slate-50/80 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Effective Schema Context</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-text-muted">Profile</span>
            <span className="text-text-main font-medium">{profile.profileName}</span>
            <span className="text-text-muted">System / Object</span>
            <span className="text-text-main">{profile.system} / {profile.object}</span>
            <span className="text-text-muted">Status</span>
            <span className="text-text-main">{profile.isPublished ? 'Published' : 'Draft'}</span>
            <span className="text-text-muted">Fields</span>
            <span className="text-text-main">{profile.effectiveFieldCount} ({profile.effectiveRequiredCount} required)</span>
            {profile.currentVersionId && (
              <>
                <span className="text-text-muted">Version</span>
                <span className="text-text-main font-mono text-[10px]">{profile.currentVersionId}</span>
              </>
            )}
          </div>
        </div>
      )}

      {!profile && (
        <p className="text-[11px] text-text-muted">No target profile attached. Test will use baseline schema.</p>
      )}

      {/* Test Results */}
      {testResult && (
        <div className={`rounded-lg border px-3 py-2.5 ${
          testResult.status === 'success'
            ? ((testResult.warnings?.length ?? 0) > 0
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-emerald-200 bg-emerald-50/50')
            : 'border-rose-200 bg-rose-50/50'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`material-symbols-outlined text-[14px] ${
              testResult.status === 'success'
                ? ((testResult.warnings?.length ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600')
                : 'text-rose-600'
            }`}>
              {testResult.status === 'success'
                ? ((testResult.warnings?.length ?? 0) > 0 ? 'warning' : 'check_circle')
                : 'error'}
            </span>
            <p className={`text-[12px] font-semibold ${
              testResult.status === 'success'
                ? ((testResult.warnings?.length ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700')
                : 'text-rose-700'
            }`}>{testResult.summary}</p>
          </div>
          {testResult.errors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {testResult.errors.map((e, i) => (
                <li key={i} className="text-[11px] text-rose-600">• {e}</li>
              ))}
            </ul>
          )}
          {(testResult.warnings?.length ?? 0) > 0 && (
            <ul className="mt-1 space-y-0.5">
              {testResult.warnings?.map((w, i) => (
                <li key={i} className="text-[11px] text-amber-700">• {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {testResult?.stages && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Stage Status</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-text-muted">Source fetch</span>
            <StageStatusBadge value={testResult.stages.sourceFetchStatus} />
            <span className="text-text-muted">Mapping</span>
            <StageStatusBadge value={testResult.stages.mappingStatus} />
            <span className="text-text-muted">Validation</span>
            <StageStatusBadge value={testResult.stages.validationStatus} />
            <span className="text-text-muted">Target delivery</span>
            <StageStatusBadge value={testResult.stages.targetDeliveryStatus} />
          </div>
        </div>
      )}

      {testResult?.recordCounts && testResult.recordCounts.total > 0 && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Record Summary</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-text-muted">Total: <span className="font-semibold text-text-main">{testResult.recordCounts.total}</span></span>
            <span className="text-emerald-700">Passed: <span className="font-semibold">{testResult.recordCounts.passed}</span></span>
            {testResult.recordCounts.failed > 0 && (
              <span className="text-amber-700">Failed: <span className="font-semibold">{testResult.recordCounts.failed}</span></span>
            )}
          </div>
        </div>
      )}

      {testResult?.payloads && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text-main">Payload Trace</p>
          <div className="rounded-lg border border-border-soft bg-white p-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Source Payload</p>
            <pre className="max-h-36 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.source)}</pre>
          </div>

          {/* Passed Records */}
          {Array.isArray(testResult.payloads.passedJson) && testResult.payloads.passedJson.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                  Passed Records ({(testResult.payloads.passedJson as unknown[]).length})
                </p>
                <button
                  type="button"
                  onClick={() => downloadJson(testResult.payloads!.passedJson, `passed-records-${testResult.testRunId}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <span className="material-symbols-outlined text-[12px]">download</span>
                  Download JSON
                </button>
              </div>
              <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.passedJson)}</pre>
            </div>
          )}

          {/* Failed Records */}
          {testResult.payloads.failedJson && testResult.payloads.failedJson.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-rose-700">
                  Failed Records ({testResult.payloads.failedJson.length})
                </p>
                <button
                  type="button"
                  onClick={() => downloadJson(testResult.payloads!.failedJson, `failed-records-${testResult.testRunId}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <span className="material-symbols-outlined text-[12px]">download</span>
                  Download JSON
                </button>
              </div>
              <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.failedJson)}</pre>
            </div>
          )}

          <div className="rounded-lg border border-border-soft bg-white p-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Mapped Outbound JSON (all records)</p>
            <pre className="max-h-36 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.outboundJson)}</pre>
          </div>
          <div className="rounded-lg border border-border-soft bg-white p-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Outbound Raw ({computedTargetType})</p>
            <pre className="max-h-36 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-text-main">{testResult.payloads.outboundRaw || prettyJson(testResult.payloads.outboundJson) || 'N/A'}</pre>
          </div>
        </div>
      )}

      {testResult?.targetResponse && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Target Response</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
            <span className="text-text-muted">Status code</span>
            <span className="text-text-main font-medium">{testResult.targetResponse.statusCode ?? 'N/A'}</span>
            <span className="text-text-muted">Target</span>
            <span className="text-text-main font-medium">{testResult.targetResponse.targetName ?? computedTargetName}</span>
          </div>
          <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{testResult.targetResponse.body || 'N/A'}</pre>
        </div>
      )}

      {/* Drift Warning (simplified for builder users) */}
      {testResult && testResult.driftSuggestionsCreated != null && testResult.driftSuggestionsCreated > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-amber-600">sync_problem</span>
            <p className="text-[12px] font-semibold text-amber-800">Target behavior may differ from current profile</p>
          </div>
          <p className="mt-1 text-[11px] text-amber-700">
            {testResult.driftSuggestionsCreated} drift suggestion{testResult.driftSuggestionsCreated > 1 ? 's' : ''} created. Admin review recommended.
          </p>
        </div>
      )}

      {!testResult && !running && (
        <p className="text-[11px] text-text-muted">Run the end-to-end test to fetch source data, apply mapping/validation, deliver JSON/XML payload, and capture response traces.</p>
      )}
    </div>
  );
}

function BuilderNodeManager({
  steps,
  activeStep,
  onSelectStep,
  hasAdditionalSource,
  hasAdditionalTarget,
  onAddSource,
  onRemoveSource,
  onAddTarget,
  onRemoveTarget,
  expanded,
  onToggleExpanded,
}: {
  steps: StepMeta[];
  activeStep: BuilderStepId;
  onSelectStep: (id: BuilderStepId) => void;
  hasAdditionalSource: boolean;
  hasAdditionalTarget: boolean;
  onAddSource: () => void;
  onRemoveSource: () => void;
  onAddTarget: () => void;
  onRemoveTarget: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-700 bg-[#0F172A] py-3 shadow-[2px_0_12px_rgba(0,0,0,0.25)] transition-[width,padding] duration-300 ease-out ${
        expanded ? 'w-[224px] px-3' : 'w-[64px] px-2'
      }`}
    >
      <div className={`mb-3 rounded-xl border border-slate-700 bg-[#0F172A]/80 ${expanded ? 'px-3 py-2' : 'px-1 py-2'}`}>
        <div className={`flex items-center ${expanded ? 'justify-between gap-2' : 'justify-center'}`}>
          {expanded ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Workflow Nodes</p>
              <p className="mt-1 text-[11px] text-slate-500">Core nodes are locked.</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-[#0F172A]/90 text-slate-300 transition-all duration-300 hover:bg-[#0F172A]/75 hover:text-white"
            aria-label={expanded ? 'Collapse left panel' : 'Expand left panel'}
            title={expanded ? 'Collapse left panel' : 'Expand left panel'}
          >
            <span
              className="material-symbols-outlined text-[17px] transition-transform duration-300 ease-out"
              style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              chevron_left
            </span>
          </button>
        </div>
      </div>

      {expanded ? (
        <>
          <div className="rounded-xl border border-slate-700 bg-[#0F172A]/60 p-2">
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Core Flow</p>
            <div className="space-y-1">
              {steps.map((step) => {
                const isActive = step.id === activeStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-all duration-200 ${
                      isActive
                        ? 'border-primary/60 bg-primary text-white shadow-[0_0_12px_rgba(191,45,66,0.3)]'
                        : 'border-slate-600/50 bg-[#0F172A]/40 text-slate-200 hover:bg-[#0F172A]/75 hover:text-white hover:border-slate-500'
                    }`}
                    title={STEP_LABELS[step.id]}
                  >
                    <WorkflowNodeIcon
                      kind={STEP_WB_META[step.id].icon}
                      size={15}
                      className={isActive ? 'text-white' : 'text-slate-200'}
                      accentColor={isActive ? '#FFFFFF' : '#BF2D42'}
                    />
                    <span className="flex-1 truncate font-medium">{STEP_LABELS[step.id]}</span>
                    <span className={`h-2 w-2 rounded-full ring-1 ring-black/20 ${step.status === 'complete' ? 'bg-emerald-400' : step.status === 'warning' ? 'bg-amber-400' : step.status === 'error' ? 'bg-rose-400' : 'bg-slate-500'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-700 bg-[#0F172A]/60 p-2">
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Optional Nodes</p>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-600/50 bg-[#0F172A]/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Additional Source</p>
                    <p className="text-[10px] text-slate-400">Adds combiner automatically</p>
                  </div>
                  {hasAdditionalSource ? (
                    <button type="button" onClick={onRemoveSource} className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors">
                      Remove
                    </button>
                  ) : (
                    <button type="button" onClick={onAddSource} className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors">
                      Add
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-600/50 bg-[#0F172A]/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Additional Target</p>
                    <p className="text-[10px] text-slate-400">Adds splitter automatically</p>
                  </div>
                  {hasAdditionalTarget ? (
                    <button type="button" onClick={onRemoveTarget} className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors">
                      Remove
                    </button>
                  ) : (
                    <button type="button" onClick={onAddTarget} className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/25 transition-colors">
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-1.5">
          {steps.map((step) => {
            const isActive = step.id === activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(step.id)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'border-primary/60 bg-primary text-white shadow-[0_0_12px_rgba(191,45,66,0.3)]'
                    : 'border-slate-600/50 bg-[#0F172A]/40 text-slate-300 hover:bg-[#0F172A]/75 hover:text-white hover:border-slate-500'
                }`}
                title={STEP_LABELS[step.id]}
                aria-label={STEP_LABELS[step.id]}
              >
                <WorkflowNodeIcon
                  kind={STEP_WB_META[step.id].icon}
                  size={17}
                  className={isActive ? 'text-white' : 'text-slate-300'}
                  accentColor={isActive ? '#FFFFFF' : '#BF2D42'}
                />
              </button>
            );
          })}

          <div className="mt-auto space-y-1.5">
            <button
              type="button"
              onClick={hasAdditionalSource ? onRemoveSource : onAddSource}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ${
                hasAdditionalSource
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                  : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
              title={hasAdditionalSource ? 'Remove Additional Source' : 'Add Additional Source'}
              aria-label={hasAdditionalSource ? 'Remove Additional Source' : 'Add Additional Source'}
            >
              <span className="material-symbols-outlined text-[17px]">{hasAdditionalSource ? 'remove_circle' : 'add_circle'}</span>
            </button>
            <button
              type="button"
              onClick={hasAdditionalTarget ? onRemoveTarget : onAddTarget}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ${
                hasAdditionalTarget
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                  : 'border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
              }`}
              title={hasAdditionalTarget ? 'Remove Additional Target' : 'Add Additional Target'}
              aria-label={hasAdditionalTarget ? 'Remove Additional Target' : 'Add Additional Target'}
            >
              <span className="material-symbols-outlined text-[17px]">{hasAdditionalTarget ? 'remove_circle' : 'add_circle'}</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

interface IntegrationBuilderPageProps {
  integrationId: string;
  forceMobileUnsupported?: boolean;
}

interface BuilderConnectionOption {
  id: string;
  name: string;
  family: string;
  status: 'Healthy' | 'Warning' | 'Failed' | 'Untested';
  baseUrl?: string;
}

type ProfileUpdateStatus = 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'REVIEW_REQUIRED' | 'END_OF_SUPPORT' | 'BLOCKED_BY_PROFILE_CHANGE';
type ProfileImpactLevel = 'NO_IMPACT' | 'INFORMATIONAL' | 'WARNING' | 'BLOCKING';

function toHealthLabel(raw: string): BuilderConnectionOption['status'] {
  switch ((raw || '').toLowerCase()) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Failed';
    default:
      return 'Untested';
  }
}

export default function IntegrationBuilderPage({ integrationId, forceMobileUnsupported = false }: IntegrationBuilderPageProps) {
  const [state, setState] = useState<BuilderState>(() => createBlankBuilderState(integrationId, 'Loading…'));
  const [availableConnections, setAvailableConnections] = useState<BuilderConnectionOption[]>([]);
  const [activeTab, setActiveTab] = useState<WorkbenchTabId>('design');
  const [diagnosticsState, setDiagnosticsState] = useState<'summary' | 'expanded'>('summary');
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(false);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [mobileUnsupported, setMobileUnsupported] = useState(forceMobileUnsupported);
  const [readiness, setReadiness] = useState<{ readinessStatus: string; checks: Record<string, unknown> } | null>(null);
  const [profileStatuses, setProfileStatuses] = useState<{
    source: ProfileUpdateStatus;
    target: ProfileUpdateStatus;
    sourceImpact: ProfileImpactLevel;
    targetImpact: ProfileImpactLevel;
  } | null>(null);
  const rightResizeRef = useRef({ active: false, startX: 0, startWidth: 380 });

  // Load integration data from API on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import('@/lib/api-client');
        const data = await api.get<any>(`/integrations/${integrationId}`);
        if (cancelled) return;

        setProfileStatuses({
          source: (data.sourceProfileUpdateStatus ?? 'UP_TO_DATE') as ProfileUpdateStatus,
          target: (data.targetProfileUpdateStatus ?? 'UP_TO_DATE') as ProfileUpdateStatus,
          sourceImpact: (data.sourceProfileImpactLevel ?? 'NO_IMPACT') as ProfileImpactLevel,
          targetImpact: (data.targetProfileImpactLevel ?? 'NO_IMPACT') as ProfileImpactLevel,
        });

        // Load workspace-scoped connections for Source/Target selectors.
        try {
          let rows: any[] = [];

          // Prefer workspace-scoped endpoint when workspaceId is present.
          if (data.workspaceId) {
            try {
              rows = await api.get<any[]>(`/workspaces/${data.workspaceId}/connections`);
            } catch {
              rows = [];
            }
          }

          // Fallback to flat endpoint using the integration workspace slug.
          if (rows.length === 0) {
            const workspaceSlug =
              typeof data.workspace?.slug === 'string' && data.workspace.slug.trim().length > 0
                ? data.workspace.slug.trim()
                : null;

            if (workspaceSlug) {
              rows = await api.get<any[]>(`/connections?slug=${encodeURIComponent(workspaceSlug)}`);
            }
          }

          if (!cancelled) {
            setAvailableConnections(
              rows.map((row) => ({
                id: String(row.id),
                name: String(row.name ?? 'Unnamed connection'),
                family: String(row.family ?? 'Unknown'),
                status: toHealthLabel(String(row.health ?? 'untested')),
                baseUrl: row.baseUrl ? String(row.baseUrl) : undefined,
              })),
            );
          }
        } catch {
          if (!cancelled) {
            setAvailableConnections([]);
          }
        }

        const tv = data.templateVersion;
        const templateLabel = tv?.templateDefinition
          ? `${tv.templateDefinition.sourceSystem ?? ''} → ${tv.templateDefinition.targetSystem ?? ''} ${tv.templateDefinition.name ?? ''} ${tv.version ?? ''}`
          : '';

        // Resolve persisted states, falling back to blank defaults
        const sourceGroup = data.sourceState ?? createBlankBuilderState('', '').sourceGroup;
        const targetGroup = data.targetState ?? createBlankBuilderState('', '').targetGroup;
        const trigger = data.triggerState ?? createBlankBuilderState('', '').trigger;
        const rawValidation = data.validationState ?? createBlankBuilderState('', '').validation;
        const validation = normalizeValidationConfig(rawValidation);
        const responseHandling = data.responseHandlingState ?? createBlankBuilderState('', '').responseHandling;
        const operations = data.operationsState ?? createBlankBuilderState('', '').operations;

        // Load mapping state from mapping sets
        const ms = data.mappingSets?.[0];
        const mappingRules = ms?.rules ?? [];

        // Resolve required target fields from effective target profile schema when available.
        let requiredTargetPaths = new Set<string>();
        let effectiveFieldCount = 0;
        let effectiveRequiredCount = 0;
        let effectiveVersionId: string | null = null;
        if (data.targetProfile?.id) {
          try {
            const effective = await api.get<any>(`/target-profiles/${data.targetProfile.id}/effective-schema`);
            const fields = Array.isArray(effective?.fields) ? effective.fields : [];
            effectiveFieldCount = fields.length;
            effectiveVersionId = typeof effective?.currentVersionId === 'string' ? effective.currentVersionId : null;
            requiredTargetPaths = new Set(
              fields
                .filter((f: any) => Boolean(f?.required) && typeof f?.path === 'string' && f.path.trim().length > 0)
                .map((f: any) => String(f.path)),
            );
            effectiveRequiredCount = requiredTargetPaths.size;
          } catch {
            // Keep defaults if effective schema is unavailable.
          }
        }

        const mappedRequiredTargetPaths = new Set<string>();
        for (const r of mappingRules) {
          const targetPath = String(r?.targetField ?? '');
          if (requiredTargetPaths.has(targetPath)) {
            mappedRequiredTargetPaths.add(targetPath);
          }
        }
        const unmappedRequiredTargetPaths = Array.from(requiredTargetPaths).filter(
          (path) => !mappedRequiredTargetPaths.has(path),
        );

        // Build effective target profile state
        let targetProfileState = targetGroup.targetProfileState ?? null;
        if (data.targetProfile) {
          targetProfileState = {
            profileId: data.targetProfile.id,
            profileName: data.targetProfile.name,
            system: data.targetProfile.system,
            object: data.targetProfile.object,
            isPublished: data.targetProfile.isPublished,
            status: data.targetProfile.isPublished ? 'profile-ready' : 'baseline-only',
            effectiveFieldCount,
            effectiveRequiredCount,
            currentVersionId: effectiveVersionId,
          };
        }

        const loadedState: BuilderState = {
          integrationId,
          integrationName: data.name,
          templateLabel,
          versionLabel: `v${data.draftVersion ?? 1} Draft`,
          validationStatus: 'Not validated',
          environment: 'Dev',
          activeStep: 'trigger',
          steps: DEFAULT_STEPS.map((s) => ({ ...s })),
          trigger,
          sourceGroup,
          mapping: {
            mappings: mappingRules.map((r: any) => ({
              id: r.id,
              sourceField: r.sourceField,
              targetField: r.targetField,
              transform: r.mappingType?.toLowerCase() ?? 'direct',
              required: requiredTargetPaths.has(String(r.targetField ?? '')),
              transformConfig: r.transformConfig ? JSON.stringify(r.transformConfig) : undefined,
            })),
            unmappedSourceFields: [],
            unmappedTargetFields: unmappedRequiredTargetPaths,
          },
          validation,
          targetGroup: { ...targetGroup, targetProfileState },
          responseHandling,
          operations,
          isDirty: false,
          isSaving: false,
          lastSavedAt: data.updatedAt ?? null,
          selectedMappingId: null,
          selectedRuleId: null,
        };
        loadedState.steps = recomputeSteps(loadedState);
        setState(loadedState);
      } catch {
        // Fallback to demo state if API fails
        setState(createDemoBuilderState(integrationId));
        setAvailableConnections([]);
        setProfileStatuses(null);
      }
    })();
    return () => { cancelled = true; };
  }, [integrationId]);

  useEffect(() => {
    if (state.activeStep === 'mapping') {
      setDiagnosticsState('summary');
    }
  }, [state.activeStep]);

  useEffect(() => {
    const evaluate = () => {
      const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
      const narrowViewport = window.innerWidth < 960;
      setMobileUnsupported(forceMobileUnsupported || mobileUserAgent || narrowViewport);
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, [forceMobileUnsupported]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!rightResizeRef.current.active) return;
      const dx = event.clientX - rightResizeRef.current.startX;
      const nextWidth = Math.max(320, Math.min(520, rightResizeRef.current.startWidth - dx));
      setRightPanelWidth(nextWidth);
    };

    const onPointerUp = () => {
      if (!rightResizeRef.current.active) return;
      rightResizeRef.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const update = useCallback((patch: Partial<BuilderState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch, isDirty: true };
      next.steps = recomputeSteps(next);
      return next;
    });
  }, []);

  const [validationTab, setValidationTab] = useState<'rules' | 'error-handler'>('rules');

  const selectStep = useCallback((id: BuilderStepId) => {
    setState((prev) => {
      const next = { ...prev, activeStep: id };
      next.steps = recomputeSteps(next);
      return next;
    });
    setActiveTab('design');
  }, []);

  const addAdditionalSource = useCallback(() => {
    setState((prev) => {
      if (prev.sourceGroup.enrichmentSources.length >= 1) return prev;
      const nextSource = {
        id: `src-extra-${Date.now()}`,
        connectionName: '',
        interfaceName: '',
        purpose: 'Secondary feed',
        strategy: 'Join' as const,
      };

      const next: BuilderState = {
        ...prev,
        activeStep: 'sourceGroup',
        sourceGroup: {
          ...prev.sourceGroup,
          enrichmentSources: [...prev.sourceGroup.enrichmentSources, nextSource],
          processingPattern: 'Primary + Enrichment',
        },
        isDirty: true,
      };
      next.steps = recomputeSteps(next);
      return next;
    });
    setActiveTab('design');
  }, []);

  const removeAdditionalSource = useCallback(() => {
    setState((prev) => {
      if (prev.sourceGroup.enrichmentSources.length === 0) return prev;
      const next: BuilderState = {
        ...prev,
        sourceGroup: {
          ...prev.sourceGroup,
          enrichmentSources: [],
          processingPattern: 'Single Source',
        },
        isDirty: true,
      };
      next.steps = recomputeSteps(next);
      return next;
    });
  }, []);

  const addAdditionalTarget = useCallback(() => {
    setState((prev) => {
      if (prev.targetGroup.targets.length >= 2) return prev;
      const additionalTarget = {
        id: `t-extra-${Date.now()}`,
        name: 'Additional target',
        priority: 2,
        connectionId: '',
        connectionName: '',
        connectionFamily: '',
        healthStatus: 'Untested',
        businessObject: '',
        operation: 'POST',
        endpointPath: '',
        writeMode: 'Create' as const,
        upsertKeyField: '',
        batchSize: 1,
        params: [],
        conflictHandling: 'Overwrite' as const,
      };

      const next: BuilderState = {
        ...prev,
        activeStep: 'targetGroup',
        targetGroup: {
          ...prev.targetGroup,
          targets: [...prev.targetGroup.targets, additionalTarget],
          deliveryPattern: 'Fan-out to Multiple Targets',
        },
        isDirty: true,
      };
      next.steps = recomputeSteps(next);
      return next;
    });
    setActiveTab('design');
  }, []);

  const removeAdditionalTarget = useCallback(() => {
    setState((prev) => {
      if (prev.targetGroup.targets.length <= 1) return prev;
      const next: BuilderState = {
        ...prev,
        targetGroup: {
          ...prev.targetGroup,
          targets: prev.targetGroup.targets.slice(0, 1),
          deliveryPattern: 'Single Target',
        },
        isDirty: true,
      };
      next.steps = recomputeSteps(next);
      return next;
    });
  }, []);

  const beginRightPanelResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!rightPanelExpanded) return;
    rightResizeRef.current.active = true;
    rightResizeRef.current.startX = event.clientX;
    rightResizeRef.current.startWidth = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelExpanded, rightPanelWidth]);

  const handleSave = useCallback(async () => {
    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const { api } = await import('@/lib/api-client');
      await api.patch(`/integrations/${integrationId}/draft`, {
        name: state.integrationName,
        sourceState: state.sourceGroup,
        targetState: state.targetGroup,
        triggerState: state.trigger,
        validationState: state.validation,
        responseHandlingState: state.responseHandling,
        operationsState: state.operations,
        sourceConnectionId: state.sourceGroup.primary.connectionId || null,
        targetConnectionId: state.targetGroup.targets[0]?.connectionId || null,
      });
      setState((prev) => ({ ...prev, isSaving: false, isDirty: false, lastSavedAt: new Date().toISOString() }));

      // Recompute readiness after save
      try {
        const r = await api.get<any>(`/integrations/${integrationId}/readiness`);
        setReadiness(r);
      } catch { /* non-blocking */ }
    } catch {
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [integrationId, state]);

  const noop = useCallback(() => {}, []);
  const stWarning = getSourceTargetWarning(state);
  const activeStep = state.activeStep;
  const meta = STEP_WB_META[activeStep];
  const completedCount = state.steps.filter((step) => step.status === 'complete').length;
  const blockedByProfile =
    profileStatuses?.source === 'END_OF_SUPPORT' ||
    profileStatuses?.target === 'END_OF_SUPPORT' ||
    profileStatuses?.source === 'BLOCKED_BY_PROFILE_CHANGE' ||
    profileStatuses?.target === 'BLOCKED_BY_PROFILE_CHANGE' ||
    profileStatuses?.sourceImpact === 'BLOCKING' ||
    profileStatuses?.targetImpact === 'BLOCKING';

  const requiredTotalCount = state.targetGroup.targetProfileState?.effectiveRequiredCount
    ?? (state.mapping.mappings.filter((m) => m.required).length + state.mapping.unmappedTargetFields.length);
  const requiredMappedCount = Math.max(0, requiredTotalCount - state.mapping.unmappedTargetFields.length);
  const transformsCount = state.mapping.mappings.filter((m) => {
    const transform = String(m.transform ?? '').trim().toLowerCase();
    return transform.length > 0 && transform !== 'direct';
  }).length;
  const hasAdditionalSource = state.sourceGroup.enrichmentSources.length > 0;
  const hasAdditionalTarget = state.targetGroup.targets.length > 1;
  const warningCount = state.steps.filter((step) => step.status === 'warning').length;
  const errorCount = state.steps.filter((step) => step.status === 'error').length;
  const diagnosticsIssues = state.steps
    .filter((step) => step.status === 'error' || step.status === 'warning')
    .map((step) => {
      let hint = 'Review this step configuration.';
      if (step.id === 'mapping') hint = 'Resolve required target mappings and transform gaps.';
      if (step.id === 'validation') hint = 'Resolve enabled blocking rules or adjust policy.';
      if (step.id === 'targetGroup') hint = 'Complete target connection and delivery setup.';
      if (step.id === 'operations') hint = 'Review retries, alerts, and diagnostics policy.';
      return {
        id: step.id,
        label: STEP_LABELS[step.id],
        status: step.status,
        hint,
      };
    });

  if (mobileUnsupported) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background-light px-6 text-center">
        <span className="material-symbols-outlined mb-4 text-[48px] text-text-muted">desktop_windows</span>
        <h1 className="text-xl font-semibold text-text-main">Builder is desktop only</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          This integration builder is currently optimized for desktop and large tablet screens.
          Please reopen on a larger device for full node editing and workflow configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100/60">
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

      <div className="flex flex-none items-center justify-between gap-3 border-b border-white/45 bg-white/50 px-4 py-2 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <IntegrationReadinessBadge status={readiness?.readinessStatus ?? 'INCOMPLETE'} />
          <span className="rounded-full border border-border-soft bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
            {completedCount}/{state.steps.length} steps complete
          </span>
          {readiness?.readinessStatus === 'TEST_PASSED' || readiness?.readinessStatus === 'READY_FOR_RELEASE_REVIEW' ? (
            <ReadyForReviewButton integrationId={integrationId} currentStatus={readiness.readinessStatus} onStatusChange={setReadiness} />
          ) : null}
        </div>

        {profileStatuses && (
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-[0.06em] text-text-muted">Profile Status</span>
            <ProfileUpdateStatusBadge status={profileStatuses.source} label="Source" />
            <ProfileUpdateStatusBadge status={profileStatuses.target} label="Target" />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-100/80 via-slate-100/45 to-slate-200/35">
        <BuilderNodeManager
          steps={state.steps}
          activeStep={activeStep}
          onSelectStep={selectStep}
          hasAdditionalSource={hasAdditionalSource}
          hasAdditionalTarget={hasAdditionalTarget}
          onAddSource={addAdditionalSource}
          onRemoveSource={removeAdditionalSource}
          onAddTarget={addAdditionalTarget}
          onRemoveTarget={removeAdditionalTarget}
          expanded={leftPanelExpanded}
          onToggleExpanded={() => setLeftPanelExpanded((prev) => !prev)}
        />

        <div className="relative min-w-0 flex-1 overflow-hidden p-3">
          <div className="relative h-full rounded-2xl border border-white/45 bg-white/25 p-2 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.7)] backdrop-blur-sm">
            {stWarning !== 'none' && (
              <div className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
                stWarning === 'block'
                  ? 'border-danger/20 bg-danger-bg/85 text-danger-text'
                  : 'border-warning/25 bg-warning-bg/85 text-warning-text'
              }`}>
                <span className="material-symbols-outlined text-[14px]">{stWarning === 'block' ? 'block' : 'warning'}</span>
                <span>
                  {stWarning === 'block'
                    ? 'Source and primary target share identical interface and method. This is blocked.'
                    : 'Source and primary target use the same connection. Verify interface separation.'}
                </span>
              </div>
            )}

            {profileStatuses && blockedByProfile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/85 px-3 py-1.5 text-[11px] font-medium text-rose-800">
                <span className="material-symbols-outlined text-[14px]">block</span>
                Release progression is blocked until profile review/rebase is completed.
              </div>
            )}

            <div className="h-[calc(100%-0.5rem)]">
              <StoryboardCanvas state={state} activeStep={activeStep} onSelectStep={selectStep} validationTab={validationTab} onValidationTabChange={setValidationTab} />
            </div>
          </div>

          {diagnosticsState === 'expanded' && (
            <div className="absolute bottom-20 right-4 z-30 w-[360px] rounded-2xl border border-white/60 bg-white/55 p-4 shadow-[0_18px_44px_-18px_rgba(15,23,42,0.7)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-text-main">Diagnostics Summary</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-text-muted hover:bg-white/70"
                    onClick={() => {
                      selectStep('validation');
                      setActiveTab('design');
                    }}
                  >
                    Open Flow Validation
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-text-muted hover:bg-white/70"
                    onClick={() => {
                      selectStep('operations');
                      setActiveTab('design');
                    }}
                  >
                    Open Ops
                  </button>
                </div>
              </div>
              <ul className="space-y-1.5 text-[11px] text-text-muted">
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Completed Steps</span>
                  <span className="font-semibold text-text-main">{completedCount}/{state.steps.length}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Error Steps</span>
                  <span className="font-semibold text-danger">{errorCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Warning Steps</span>
                  <span className="font-semibold text-warning">{warningCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Required Fields Pending</span>
                  <span className="font-semibold text-text-main">{state.mapping.unmappedTargetFields.length}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Required Fields Mapped</span>
                  <span className="font-semibold text-text-main">{requiredMappedCount}/{requiredTotalCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Transforms Configured</span>
                  <span className="font-semibold text-text-main">{transformsCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Diagnostics Level</span>
                  <span className="font-semibold text-text-main">{state.operations.diagnosticsLevel}</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-100/65 px-2 py-1.5">
                  <span>Optional Nodes</span>
                  <span className="font-semibold text-text-main">{hasAdditionalSource ? '1 extra source' : 'No extra source'} / {hasAdditionalTarget ? '1 extra target' : 'No extra target'}</span>
                </li>
                {blockedByProfile && (
                  <li className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50/80 px-2 py-1.5 text-rose-700">
                    <span>Release Block</span>
                    <span className="font-semibold">Profile review required</span>
                  </li>
                )}
              </ul>

              <div className="mt-3 rounded-md border border-border-soft/80 bg-white/55 p-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Top Flow Issues</p>
                {diagnosticsIssues.length === 0 ? (
                  <p className="text-[11px] text-emerald-700">No blocking or warning steps detected.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {diagnosticsIssues.slice(0, 4).map((issue) => (
                      <li key={issue.id} className="rounded-md bg-slate-100/70 px-2 py-1.5">
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-2 text-left"
                          onClick={() => {
                            selectStep(issue.id);
                            setActiveTab('design');
                          }}
                        >
                          <span>
                            <span className="block text-[11px] font-semibold text-text-main">{issue.label}</span>
                            <span className="block text-[10px] text-text-muted">{issue.hint}</span>
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${issue.status === 'error' ? 'bg-danger-bg text-danger-text' : 'bg-warning-bg text-warning-text'}`}>
                            {issue.status}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDiagnosticsState((prev) => (prev === 'summary' ? 'expanded' : 'summary'))}
            className="absolute bottom-4 right-4 z-30 rounded-full border border-white/60 bg-white/55 px-5 py-2 text-[12px] font-semibold text-text-main shadow-[0_14px_34px_-16px_rgba(15,23,42,0.72)] backdrop-blur-xl transition hover:bg-white/70"
          >
            Status: <span className="text-danger">{errorCount} Errors</span>, <span className="text-warning">{warningCount} Warnings</span>
          </button>
        </div>

        <aside
          className="relative flex shrink-0 flex-col border-l border-white/45 bg-white/45 backdrop-blur-md transition-[width] duration-200"
          style={{ width: rightPanelExpanded ? rightPanelWidth : 56 }}
        >
          {rightPanelExpanded && (
            <button
              type="button"
              onPointerDown={beginRightPanelResize}
              className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize rounded-full bg-slate-300/20 hover:bg-slate-400/40"
              aria-label="Resize configuration panel"
              title="Resize configuration panel"
            />
          )}

          {rightPanelExpanded ? (
            <>
              <div className="border-b border-white/55 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
                    <WorkflowNodeIcon kind={meta.icon} size={16} className="text-current" accentColor="#BF2D42" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-main">{STEP_LABELS[activeStep]}</p>
                    <p className="text-[11px] text-text-muted">{meta.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRightPanelExpanded(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft bg-surface/85 text-text-muted transition hover:bg-slate-100 hover:text-text-main"
                    aria-label="Collapse right panel"
                    title="Collapse right panel"
                  >
                    <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                  </button>
                </div>
              </div>

              <WorkbenchTabs activeTab={activeTab} onTabChange={setActiveTab} />

              <div className="min-h-0 flex-1 overflow-y-auto bg-surface/65">
                {activeTab === 'design' && activeStep === 'trigger' && (
                  <TriggerWorkbench config={state.trigger} onChange={(trigger) => update({ trigger })} />
                )}
                {activeTab === 'design' && activeStep === 'sourceGroup' && (
                  <SourceGroupWorkbench
                    config={state.sourceGroup}
                    connections={availableConnections}
                    onChange={(sourceGroup) => update({ sourceGroup })}
                  />
                )}
                {activeTab === 'design' && activeStep === 'mapping' && (
                  <MappingStudioSummaryCard
                    integrationId={integrationId}
                    mappedCount={state.mapping.mappings.length}
                    requiredTotalCount={requiredTotalCount}
                    requiredMappedCount={requiredMappedCount}
                    unresolvedRequiredCount={state.mapping.unmappedTargetFields.length}
                    transformsCount={transformsCount}
                    lastUpdated={state.lastSavedAt}
                    status={state.steps.find((s) => s.id === 'mapping')?.status === 'complete' ? 'valid' : 'pending'}
                  />
                )}
                {activeTab === 'design' && activeStep === 'validation' && (
                  <ValidationWorkbench
                    config={state.validation}
                    onChange={(validation) => update({ validation })}
                    selectedRuleId={state.selectedRuleId}
                    onSelectRule={(id) => setState((p) => ({ ...p, selectedRuleId: id }))}
                    targetFields={state.mapping.mappings.map((m) => m.targetField)}
                    activeTab={validationTab}
                    onTabChange={setValidationTab}
                  />
                )}
                {activeTab === 'design' && activeStep === 'targetGroup' && (
                  <TargetGroupWorkbench
                    config={state.targetGroup}
                    connections={availableConnections}
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
                {activeTab === 'test' && <StepTestPanel step={activeStep} state={state} integrationId={integrationId} />}
              </div>
            </>
          ) : (
            <div className="flex h-full items-start justify-center px-2 pt-4">
              <button
                type="button"
                onClick={() => setRightPanelExpanded(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-soft bg-surface/80 text-text-muted transition hover:bg-slate-100 hover:text-text-main"
                aria-label="Expand right panel"
                title="Expand right panel"
              >
                <span className="material-symbols-outlined text-[17px]">chevron_left</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
