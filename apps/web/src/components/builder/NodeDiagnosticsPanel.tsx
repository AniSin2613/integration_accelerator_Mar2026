'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BuilderStepId, BuilderState } from './types';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { PreviewPanel } from '@/components/mapping-studio/PreviewPanel';

/* ------------------------------------------------------------------ */
/*  E2E result slice – same shape as the parent E2ETestResult          */
/* ------------------------------------------------------------------ */
interface E2EResultSlice {
  testRunId?: string;
  createdAt?: string;
  status: string;
  summary: string;
  errors: string[];
  warnings?: string[];
  recordCounts?: { total: number; passed: number; failed: number };
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
  hasReceipt?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function StageStatusBadge({ value }: { value?: string }) {
  const v = value ?? 'N/A';
  const color = v === 'SUCCESS' ? 'text-success-text' : v === 'PARTIAL' ? 'text-warning-text' : v === 'FAILED' ? 'text-danger-text' : v === 'SKIPPED' ? 'text-slate-400' : 'text-text-main';
  return <span className={`font-medium ${color}`}>{v}</span>;
}

const prettyJson = (v: unknown) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } };

/** Shared action button used across all diagnostic sub-panels */
function DiagButton({ label, icon, onClick, loading, variant = 'default' }: {
  label: string; icon: string; onClick: () => void; loading?: boolean; variant?: 'default' | 'primary';
}) {
  const base = 'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none';
  const styles = variant === 'primary'
    ? `${base} bg-primary text-white hover:bg-primary/90`
    : `${base} border border-border-soft bg-surface text-text-main hover:bg-background-light`;
  return (
    <button type="button" onClick={onClick} disabled={loading} className={styles}>
      <span className="material-symbols-outlined text-[14px]">{loading ? 'progress_activity' : icon}</span>
      {loading ? 'Running…' : label}
    </button>
  );
}

/** Map an action result status to the design-system Badge variant */
function statusToBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'pass' || s === 'success' || s === 'healthy') return 'success';
  if (s === 'warn' || s === 'warning') return 'warning';
  if (s === 'fail' || s === 'error' || s === 'failed') return 'danger';
  return 'neutral';
}

/* ================================================================== */
/*  Per-node diagnostic sub-panels                                     */
/* ================================================================== */

function TriggerDiagnostics({ state, integrationId }: { state: BuilderState; integrationId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lastInvocation, setLastInvocation] = useState<any>(null);
  const [invLoading, setInvLoading] = useState(false);

  const testTrigger = async () => {
    setLoading(true);
    try { setResult(await api.post(`/integrations/${integrationId}/node-test/trigger`, {})); }
    catch (e) { setResult({ status: 'error', checks: [{ check: 'Request', status: 'fail', detail: e instanceof Error ? e.message : 'Unknown error' }] }); }
    finally { setLoading(false); }
  };

  const viewLastInvocation = async () => {
    setInvLoading(true);
    try { setLastInvocation(await api.get(`/integrations/${integrationId}/node-test/trigger/last-invocation`)); }
    catch (e) { setLastInvocation({ hasInvocation: false, message: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setInvLoading(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Trigger Summary</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Type</span>
          <span className="text-text-main font-medium">{state.trigger.triggerType}</span>
          <span className="text-text-muted">Schedule</span>
          <span className="text-text-main font-mono text-[10px]">{state.trigger.cronExpression || 'Not set'}</span>
          <span className="text-text-muted">Webhook</span>
          <span className="text-text-main font-mono text-[10px]">{state.trigger.webhookPath || 'Not configured'}</span>
          <span className="text-text-muted">Manual execution</span>
          <span className="text-text-main">{state.trigger.manualExecutionEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DiagButton icon="bolt" label="Test Trigger Config" onClick={testTrigger} loading={loading} variant="primary" />
        <DiagButton icon="history" label="View Last Invocation" onClick={viewLastInvocation} loading={invLoading} />
      </div>

      {/* Test Trigger Result */}
      {result && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Test Result</p>
            <Badge variant={statusToBadgeVariant(result.status)} dot label={result.status} />
          </div>
          <div className="space-y-1">
            {result.checks?.map((c: any, i: number) => (
              <div key={i} className={`flex items-center gap-1.5 text-[10px] ${c.status === 'pass' ? 'text-success-text' : c.status === 'warn' ? 'text-warning-text' : 'text-danger-text'}`}>
                <span className="material-symbols-outlined text-[12px]">{c.status === 'pass' ? 'check_circle' : c.status === 'warn' ? 'warning' : 'cancel'}</span>
                <span className="font-medium">{c.check}:</span>
                <span>{c.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Invocation Result */}
      {lastInvocation && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last Invocation</p>
          {lastInvocation.hasInvocation ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-text-muted">Status</span>
              <span className="text-text-main font-medium">{lastInvocation.status}</span>
              <span className="text-text-muted">Created</span>
              <span className="text-text-main">{new Date(lastInvocation.createdAt).toLocaleString()}</span>
              <span className="text-text-muted">Source Fetch</span>
              <StageStatusBadge value={lastInvocation.sourceFetchStatus} />
              <span className="text-text-muted">Mapping</span>
              <StageStatusBadge value={lastInvocation.mappingStatus} />
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">{lastInvocation.message}</p>
          )}
        </div>
      )}
    </>
  );
}

function SourceDiagnostics({ state, testResult, integrationId }: { state: BuilderState; testResult: E2EResultSlice | null; integrationId: string }) {
  const p = state.sourceGroup.primary;
  const [connLoading, setConnLoading] = useState(false);
  const [connResult, setConnResult] = useState<any>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState<any>(null);

  const testConnection = async () => {
    setConnLoading(true);
    try { setConnResult(await api.post(`/integrations/${integrationId}/node-test/source/connection`, {})); }
    catch (e) { setConnResult({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setConnLoading(false); }
  };

  const fetchSample = async () => {
    setSampleLoading(true);
    try { setSampleResult(await api.post(`/integrations/${integrationId}/node-test/source/sample`, {})); }
    catch (e) { setSampleResult({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setSampleLoading(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Connection Health</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Connection</span>
          <span className="text-text-main font-medium">{p.connectionName || 'Not configured'}</span>
          <span className="text-text-muted">Status</span>
          <span className={`font-medium ${p.healthStatus === 'Healthy' ? 'text-success-text' : p.healthStatus === 'Warning' ? 'text-warning-text' : p.healthStatus === 'Failed' ? 'text-danger-text' : 'text-text-muted'}`}>
            {p.healthStatus || 'Untested'}
          </span>
          <span className="text-text-muted">Business object</span>
          <span className="text-text-main">{p.businessObject || 'Not set'}</span>
          <span className="text-text-muted">Endpoint</span>
          <span className="text-text-main font-mono text-[10px]">{p.endpointPath || 'Not set'}</span>
          <span className="text-text-muted">Enrichments</span>
          <span className="text-text-main">{state.sourceGroup.enrichmentSources.length} configured</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DiagButton icon="cable" label="Test Connection" onClick={testConnection} loading={connLoading} variant="primary" />
        <DiagButton icon="download" label="Fetch Sample" onClick={fetchSample} loading={sampleLoading} />
      </div>

      {/* Connection Test Result */}
      {connResult && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Connection Test</p>
            <Badge variant={statusToBadgeVariant(connResult.status ?? 'unknown')} dot label={connResult.status ?? 'unknown'} />
          </div>
          {connResult.message && <p className="text-[11px] text-text-main">{connResult.message}</p>}
          {connResult.latency && <p className="text-[10px] text-text-muted mt-1">Latency: {connResult.latency}ms</p>}
        </div>
      )}

      {/* Fetch Sample Result */}
      {sampleResult && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Source Sample</p>
            <Badge variant={statusToBadgeVariant(sampleResult.status)} dot label={sampleResult.status} />
          </div>
          {sampleResult.status === 'success' ? (
            <>
              <p className="text-[10px] text-text-muted mb-1">{sampleResult.recordCount} record(s) fetched</p>
              <pre className="max-h-44 overflow-auto rounded bg-white p-2 text-[10px] text-text-main border border-border-soft">{prettyJson(sampleResult.payload)}</pre>
            </>
          ) : (
            <p className="text-[11px] text-danger-text">{sampleResult.message}</p>
          )}
        </div>
      )}

      {/* E2E slice: source fetch status */}
      {testResult?.stages?.sourceFetchStatus && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last E2E — Source Fetch</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-text-muted">Fetch status</span>
            <StageStatusBadge value={testResult.stages.sourceFetchStatus} />
          </div>
          {testResult.payloads?.source != null && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-text-muted mb-1">Source Payload</p>
              <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.source)}</pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function MappingDiagnostics({ state, testResult, integrationId, previewCache, setPreviewCache }: {
  state: BuilderState; testResult: E2EResultSlice | null; integrationId: string;
  previewCache: any; setPreviewCache: (d: any) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/integrations/${integrationId}/preview-payloads`);
      setPreviewCache(data);
    } catch { /* keep existing cache on error */ }
    finally { setLoading(false); }
  };

  // Auto-load on first mount if cache is empty
  useEffect(() => {
    if (previewCache) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/integrations/${integrationId}/preview-payloads`);
        if (!cancelled) setPreviewCache(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [integrationId, previewCache, setPreviewCache]);

  const handleOpenPreview = () => {
    setPreviewOpen(true);
    // If no cached data, start fetching — loading state shows inside the panel
    if (!previewCache) {
      setLoading(true);
      api.get(`/integrations/${integrationId}/preview-payloads`)
        .then((data: any) => { setPreviewCache(data); })
        .catch(() => { /* panel will show empty state */ })
        .finally(() => setLoading(false));
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/integrations/${integrationId}/preview-payloads`);
      setPreviewCache(data);
    } catch { /* keep stale cache */ }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Mapping Coverage</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Total mappings</span>
          <span className="text-text-main font-medium">{state.mapping.mappings.length}</span>
          <span className="text-text-muted">Required fields mapped</span>
          <span className="text-text-main">{state.mapping.mappings.filter((m) => m.required).length}</span>
          <span className="text-text-muted">Unmapped required</span>
          <span className={`font-medium ${state.mapping.unmappedTargetFields.length > 0 ? 'text-warning-text' : 'text-success-text'}`}>
            {state.mapping.unmappedTargetFields.length}
          </span>
          <span className="text-text-muted">With transforms</span>
          <span className="text-text-main">{state.mapping.mappings.filter((m) => m.transform && m.transform !== 'Direct / None').length}</span>
        </div>
      </div>

      {/* Preview status + open button */}
      <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Mapping Preview</p>
          {previewCache?.previewedAt && (
            <span className="text-[10px] text-text-muted">
              Last run: {new Date(previewCache.previewedAt).toLocaleString()}
            </span>
          )}
        </div>

        {previewCache ? (
          <p className="text-[10px] text-text-muted mb-2">
            {previewCache.mappingRuleCount ?? 0} mapping rule(s) applied · v{previewCache.mappingVersion ?? '?'}
            {previewCache.sourceError ? ' · Source fetch error' : ''}
            {previewCache.targetError ? ' · Mapping error' : ''}
          </p>
        ) : (
          <p className="text-[10px] text-text-muted mb-2">
            {loading ? 'Loading preview…' : 'No preview available yet.'}
          </p>
        )}

        <DiagButton
          icon="preview"
          label={previewCache ? 'Open Mapping Preview' : 'Run Mapping Preview'}
          onClick={handleOpenPreview}
          loading={loading}
          variant="primary"
        />
      </div>

      {/* Glassmorphism Preview Panel — same component as Mapping Studio */}
      {previewOpen && (
        <PreviewPanel
          sourcePayload={previewCache?.sourcePayload ?? null}
          targetPayload={previewCache?.targetPayload ?? null}
          sourceError={previewCache?.sourceError ?? null}
          targetError={previewCache?.targetError ?? null}
          loading={loading}
          onClose={() => setPreviewOpen(false)}
          previewedAt={previewCache?.previewedAt ?? null}
          onRefresh={handleRefresh}
          refreshing={loading}
        />
      )}

      {/* E2E slice: mapping trace */}
      {testResult?.stages?.mappingStatus && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last E2E — Mapping</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-text-muted">Mapping status</span>
            <StageStatusBadge value={testResult.stages.mappingStatus} />
          </div>
          {testResult.payloads?.outboundJson != null && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-text-muted mb-1">Transformed Output</p>
              <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{prettyJson(testResult.payloads.outboundJson)}</pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ValidationDiagnostics({ state, integrationId }: { state: BuilderState; integrationId: string }) {
  const [testPayload, setTestPayload] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const rules = state.validation.rules;
  const errorRules = rules.filter((r) => r.severity === 'Error');
  const warnRules = rules.filter((r) => r.severity === 'Warning');

  const runValidation = async () => {
    if (!testPayload.trim()) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(testPayload); } catch { setValidationResult({ status: 'error', message: 'Invalid JSON payload' }); return; }
    setLoading(true);
    try { setValidationResult(await api.post(`/integrations/${integrationId}/node-test/validation/sample`, { samplePayload: parsed })); }
    catch (e) { setValidationResult({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setLoading(false); }
  };

  return (
    <>
      {/* Rule Summary */}
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Rule Summary</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Total rules</span>
          <span className="text-text-main font-medium">{rules.length}</span>
          <span className="text-text-muted">Error-level</span>
          <span className="text-danger-text font-medium">{errorRules.length}</span>
          <span className="text-text-muted">Warning-level</span>
          <span className="text-warning-text font-medium">{warnRules.length}</span>
          <span className="text-text-muted">Policy mode</span>
          <span className="text-text-main">{state.validation.policyMode}</span>
        </div>
      </div>

      {/* Validate Sample */}
      {rules.length > 0 && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Validate Sample Payload</p>
          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            placeholder='{"invoice-number": "INV-001", "gross-total": 150}'
            rows={3}
            className="w-full rounded border border-border-soft bg-surface px-2 py-1.5 text-[11px] font-mono text-text-main placeholder:text-text-muted/40 focus:border-primary/50 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <DiagButton icon="cloud_upload" label="Validate Sample" onClick={runValidation} loading={loading} variant="primary" />
          </div>

          {/* Validation results */}
          {validationResult && (
            <div className="mt-2 rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Validation Result</p>
                <Badge variant={statusToBadgeVariant(validationResult.status)} dot label={validationResult.status} />
              </div>
              {validationResult.results?.map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-1.5 text-[10px] ${r.passed ? 'text-success-text' : 'text-danger-text'}`}>
                  <span className="material-symbols-outlined text-[11px]">{r.passed ? 'check_circle' : 'cancel'}</span>
                  <span className="font-medium">{r.ruleName}:</span>
                  <span>{r.message}</span>
                </div>
              ))}
              {validationResult.message && <p className="text-[11px] text-text-muted mt-1">{validationResult.message}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TargetDiagnostics({ state, testResult, integrationId }: { state: BuilderState; testResult: E2EResultSlice | null; integrationId: string }) {
  const t = state.targetGroup.targets[0];
  const [connLoading, setConnLoading] = useState(false);
  const [connResult, setConnResult] = useState<any>(null);

  const testConnection = async () => {
    setConnLoading(true);
    try { setConnResult(await api.post(`/integrations/${integrationId}/node-test/target/connection`, {})); }
    catch (e) { setConnResult({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setConnLoading(false); }
  };

  return (
    <>
      {/* Target Summary */}
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Target Summary</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Primary target</span>
          <span className="text-text-main font-medium">{t?.name || t?.connectionName || 'Not configured'}</span>
          <span className="text-text-muted">Status</span>
          <span className={`font-medium ${t?.healthStatus === 'Healthy' ? 'text-success-text' : t?.healthStatus === 'Warning' ? 'text-warning-text' : t?.healthStatus === 'Failed' ? 'text-danger-text' : 'text-text-muted'}`}>
            {t?.healthStatus || 'Untested'}
          </span>
          <span className="text-text-muted">Endpoint</span>
          <span className="text-text-main font-mono text-[10px]">{t?.endpointPath || 'Not set'}</span>
          <span className="text-text-muted">Total targets</span>
          <span className="text-text-main">{state.targetGroup.targets.length}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DiagButton icon="cable" label="Test Connection" onClick={testConnection} loading={connLoading} variant="primary" />
      </div>

      {/* Connection Test Result */}
      {connResult && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Connection Test</p>
            <Badge variant={statusToBadgeVariant(connResult.status ?? 'unknown')} dot label={connResult.status ?? 'unknown'} />
          </div>
          {connResult.message && <p className="text-[11px] text-text-main">{connResult.message}</p>}
          {connResult.latency && <p className="text-[10px] text-text-muted mt-1">Latency: {connResult.latency}ms</p>}
        </div>
      )}

      {/* E2E slice: delivery + target response */}
      {testResult && testResult.status !== 'running' && (
        <div className={`rounded-lg border px-3 py-2.5 ${testResult.status === 'success' ? 'border-success bg-success-bg' : 'border-danger bg-danger-bg'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last E2E — Delivery Results</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
            <span className="text-text-muted">Overall status</span>
            <span className={`font-semibold ${testResult.status === 'success' ? 'text-success-text' : 'text-danger-text'}`}>{testResult.status.toUpperCase()}</span>
            <span className="text-text-muted">Delivery</span>
            <StageStatusBadge value={testResult.stages?.targetDeliveryStatus} />
            {testResult.recordCounts && (
              <>
                <span className="text-text-muted">Records</span>
                <span className="text-text-main">
                  {testResult.recordCounts.total} total · {testResult.recordCounts.passed} passed · {testResult.recordCounts.failed} failed
                </span>
              </>
            )}
          </div>
          {testResult.summary && <p className="text-[11px] text-text-main mb-2">{testResult.summary}</p>}
          {testResult.errors.length > 0 && (
            <ul className="space-y-0.5 mb-2">
              {testResult.errors.map((e, i) => <li key={i} className="text-[11px] text-danger-text">• {e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Target Response */}
      {testResult?.targetResponse && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Target Response</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
            <span className="text-text-muted">Status code</span>
            <span className="text-text-main font-medium">{testResult.targetResponse.statusCode ?? 'N/A'}</span>
            <span className="text-text-muted">Target</span>
            <span className="text-text-main font-medium">{testResult.targetResponse.targetName ?? t?.name ?? 'N/A'}</span>
          </div>
          <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{testResult.targetResponse.body || 'N/A'}</pre>
        </div>
      )}

      {/* Outbound Payload */}
      {testResult?.payloads?.outboundRaw && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Outbound Payload</p>
          <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{testResult.payloads.outboundRaw}</pre>
        </div>
      )}

      {/* Receipt link */}
      {testResult?.hasReceipt && (
        <Link
          href={`/integrations/${integrationId}/demo-targets`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">receipt_long</span>
          View receipt & delivery history
        </Link>
      )}

      {!testResult && (
        <p className="text-[11px] text-text-muted">Run an E2E test using the <span className="font-semibold">Test</span> button in the header bar to see delivery results here.</p>
      )}
    </>
  );
}

function ResponseDiagnostics({ state, testResult, integrationId }: { state: BuilderState; testResult: E2EResultSlice | null; integrationId: string }) {
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const previewResponse = async () => {
    setLoading(true);
    try { setPreviewResult(await api.get(`/integrations/${integrationId}/node-test/response/preview`)); }
    catch (e) { setPreviewResult({ error: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Response Handling</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Success criteria</span>
          <span className="text-text-main">{state.responseHandling.successCriteria === 'only_2xx' ? 'Only 2xx' : 'Any response'}</span>
          <span className="text-text-muted">To source</span>
          <span className="text-text-main">{state.responseHandling.outputToSource === 'auto_if_expected' ? 'Auto' : 'No'}</span>
          <span className="text-text-muted">Notification</span>
          <span className="text-text-main">{state.responseHandling.notificationEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DiagButton icon="preview" label="Preview Response Config" onClick={previewResponse} loading={loading} variant="primary" />
      </div>

      {/* Preview Response Result */}
      {previewResult && !previewResult.error && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Response Preview</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
            <span className="text-text-muted">Target</span>
            <span className="text-text-main font-medium">{previewResult.targetName}</span>
            <span className="text-text-muted">Notification</span>
            <span className="text-text-main">{previewResult.config?.notificationEnabled ? `Enabled → ${previewResult.config.notificationDestinationUrl || 'No URL'}` : 'Disabled'}</span>
          </div>
          {previewResult.lastResponse && (
            <>
              <p className="text-[10px] font-semibold text-text-muted mb-1">Last Response ({previewResult.lastResponse.status})</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-1">
                <span className="text-text-muted">Status code</span>
                <span className="text-text-main">{previewResult.lastResponse.statusCode ?? 'N/A'}</span>
                <span className="text-text-muted">Received</span>
                <span className="text-text-main">{new Date(previewResult.lastResponse.createdAt).toLocaleString()}</span>
              </div>
              {previewResult.lastResponse.body && (
                <pre className="max-h-28 overflow-auto rounded bg-white p-2 text-[10px] text-text-main border border-border-soft">{typeof previewResult.lastResponse.body === 'string' ? previewResult.lastResponse.body : prettyJson(previewResult.lastResponse.body)}</pre>
              )}
            </>
          )}
          {!previewResult.lastResponse && <p className="text-[11px] text-text-muted">No previous response data available.</p>}
        </div>
      )}
      {previewResult?.error && (
        <div className="rounded-lg border border-danger bg-danger-bg px-3 py-2.5">
          <p className="text-[11px] text-danger-text">{previewResult.error}</p>
        </div>
      )}

      {/* E2E slice: target response trace */}
      {testResult?.targetResponse && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last E2E — Response Trace</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
            <span className="text-text-muted">Status code</span>
            <span className="text-text-main font-medium">{testResult.targetResponse.statusCode ?? 'N/A'}</span>
          </div>
          <pre className="max-h-36 overflow-auto rounded bg-white p-2 text-[10px] text-text-main">{testResult.targetResponse.body || 'N/A'}</pre>
        </div>
      )}
    </>
  );
}

function OperationsDiagnostics({ state, testResult, integrationId }: { state: BuilderState; testResult: E2EResultSlice | null; integrationId: string }) {
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsResult, setAlertsResult] = useState<any>(null);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try { setHealthResult(await api.post(`/integrations/${integrationId}/node-test/operations/health-check`, {})); }
    catch (e) { setHealthResult({ status: 'error', checks: [{ component: 'Request', status: 'error', detail: e instanceof Error ? e.message : 'Unknown error' }] }); }
    finally { setHealthLoading(false); }
  };

  const viewAlerts = async () => {
    setAlertsLoading(true);
    try { setAlertsResult(await api.get(`/integrations/${integrationId}/node-test/operations/alerts`)); }
    catch (e) { setAlertsResult({ alertCount: 0, alerts: [], error: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setAlertsLoading(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Monitoring Policy</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-text-muted">Failure behavior</span>
          <span className="text-text-main">{state.operations.failureBehavior === 'retry' ? `Retry ${state.operations.retryAttempts}x` : state.operations.failureBehavior === 'stop' ? 'Stop' : 'Failed queue'}</span>
          <span className="text-text-muted">Run history</span>
          <span className="text-text-main">{state.operations.storeRunHistory ? `${state.operations.retentionDays} days` : 'Off'}</span>
          <span className="text-text-muted">Notification type</span>
          <span className="text-text-main">{state.operations.notificationType}</span>
          <span className="text-text-muted">Alert recipients</span>
          <span className="text-text-main">{state.operations.alertRecipients || 'None'}</span>
        </div>
      </div>

      {/* E2E slice: stage overview from last run */}
      {testResult?.stages && (
        <div className="rounded-lg border border-border-soft bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted mb-1.5">Last E2E — Stage Overview</p>
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
          {testResult.recordCounts && (
            <div className="mt-2 flex items-center gap-4 text-[11px]">
              <span className="text-text-muted">Records: <span className="font-semibold text-text-main">{testResult.recordCounts.total}</span></span>
              <span className="text-success-text">Passed: <span className="font-semibold">{testResult.recordCounts.passed}</span></span>
              {testResult.recordCounts.failed > 0 && (
                <span className="text-warning-text">Failed: <span className="font-semibold">{testResult.recordCounts.failed}</span></span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <DiagButton icon="monitor_heart" label="Run Health Check" onClick={runHealthCheck} loading={healthLoading} variant="primary" />
        <DiagButton icon="notifications" label="View Latest Alerts" onClick={viewAlerts} loading={alertsLoading} />
      </div>

      {/* Health Check Result */}
      {healthResult && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Health Check</p>
            <Badge variant={statusToBadgeVariant(healthResult.status)} dot label={healthResult.status} />
          </div>
          <div className="space-y-1">
            {healthResult.checks?.map((c: any, i: number) => (
              <div key={i} className={`flex items-center gap-1.5 text-[10px] ${c.status === 'healthy' ? 'text-success-text' : c.status === 'warning' ? 'text-warning-text' : c.status === 'error' ? 'text-danger-text' : 'text-text-muted'}`}>
                <span className="material-symbols-outlined text-[11px]">{c.status === 'healthy' ? 'check_circle' : c.status === 'warning' ? 'warning' : c.status === 'error' ? 'cancel' : 'help'}</span>
                <span className="font-medium">{c.component}:</span>
                <span>{c.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Result */}
      {alertsResult && (
        <div className="rounded-lg border border-border-soft bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Latest Alerts</p>
            <span className="text-[10px] font-medium text-text-muted">{alertsResult.alertCount} alert(s)</span>
          </div>
          {alertsResult.alertCount === 0 && <p className="text-[11px] text-success-text">No active alerts. All clear.</p>}
          {alertsResult.alerts?.map((a: any, i: number) => (
            <div key={i} className={`flex items-start gap-1.5 text-[10px] mb-1 ${a.severity === 'error' ? 'text-danger-text' : a.severity === 'warning' ? 'text-warning-text' : 'text-text-muted'}`}>
              <span className="material-symbols-outlined text-[11px] mt-0.5">{a.severity === 'error' ? 'error' : a.severity === 'warning' ? 'warning' : 'info'}</span>
              <div>
                <span className="font-medium">{a.message}</span>
                <span className="text-text-muted ml-1.5">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {alertsResult.error && <p className="text-[11px] text-danger-text">{alertsResult.error}</p>}
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Main Panel                                                         */
/* ================================================================== */

interface NodeDiagnosticsPanelProps {
  step: BuilderStepId;
  state: BuilderState;
  integrationId: string;
  testResult?: E2EResultSlice | null;
}

export function NodeDiagnosticsPanel({ step, state, integrationId, testResult = null }: NodeDiagnosticsPanelProps) {
  // Lifted preview cache — persists across node switches
  const [previewCache, setPreviewCache] = useState<any>(null);

  return (
    <div className="space-y-3 p-4">
      {step === 'trigger' && <TriggerDiagnostics state={state} integrationId={integrationId} />}
      {step === 'sourceGroup' && <SourceDiagnostics state={state} testResult={testResult} integrationId={integrationId} />}
      {step === 'mapping' && <MappingDiagnostics state={state} testResult={testResult} integrationId={integrationId} previewCache={previewCache} setPreviewCache={setPreviewCache} />}
      {step === 'validation' && <ValidationDiagnostics state={state} integrationId={integrationId} />}
      {step === 'targetGroup' && <TargetDiagnostics state={state} testResult={testResult} integrationId={integrationId} />}
      {step === 'responseHandling' && <ResponseDiagnostics state={state} testResult={testResult} integrationId={integrationId} />}
      {step === 'operations' && <OperationsDiagnostics state={state} testResult={testResult} integrationId={integrationId} />}
    </div>
  );
}
