'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { BearerTokenDisplay, FamilySpecificEditor, SelectField, TextField, labelValueRows } from './ConnectionFormFields';
import {
  type ConnectionConfig,
  type ConnectionDetail,
  type ConnectionFamily,
  type ConnectionTestResult,
  ENUM_TO_FAMILY,
  FAMILY_TO_ENUM,
  createDefaultConfig,
  timeAgo,
  toDisplayHealth,
} from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ConnectionDrawerProps {
  isOpen: boolean;
  connectionId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function normalizeConfigForSubmit(config: ConnectionConfig, platformLabel?: string): ConnectionConfig {
  const normalized = { ...config, platformLabel: platformLabel?.trim() || undefined } as ConnectionConfig;

  // Backend requires API key placement when API Key auth is selected.
  if (normalized.family === 'REST / OpenAPI outbound' && normalized.authMethod === 'API Key') {
    normalized.apiKeyPlacement = normalized.apiKeyPlacement ?? 'Header';
  }

  return normalized;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ConnectionDrawer({ isOpen, connectionId, onClose, onSaved, onDeleted }: ConnectionDrawerProps) {
  const [detail, setDetail] = useState<ConnectionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Edit-mode draft state
  const [draftName, setDraftName] = useState('');
  const [draftFamily, setDraftFamily] = useState<ConnectionFamily>('REST / OpenAPI outbound');
  const [draftPlatformLabel, setDraftPlatformLabel] = useState('');
  const [draftConfig, setDraftConfig] = useState<ConnectionConfig>(createDefaultConfig('REST / OpenAPI outbound'));

  // Save / test state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch detail when connectionId changes
  useEffect(() => {
    if (!connectionId) {
      setDetail(null);
      setMode('view');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<ConnectionDetail>(`/connections/${connectionId}`)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setMode('view');
        populateDraft(data);
        // Seed banner from last test history so result persists across drawer open/close
        if (data.testHistory.length > 0) {
          const latest = data.testHistory[0];
          setTestResult({
            connectionId: data.id,
            environmentId: '',
            status: latest.status,
            testedAt: latest.testedAt,
            summaryMessage: latest.summaryMessage,
            latencyMs: null,
            details: {},
          });
        } else {
          setTestResult(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load connection.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  const populateDraft = useCallback((d: ConnectionDetail) => {
    setDraftName(d.name);
    const family = ENUM_TO_FAMILY[d.family] ?? (d.familyLabel as ConnectionFamily);
    setDraftFamily(family);
    setDraftPlatformLabel(d.platformLabel ?? '');
    const cfg = d.config as unknown as ConnectionConfig;
    setDraftConfig({ ...createDefaultConfig(family), ...cfg, family } as ConnectionConfig);
  }, []);

  const switchToEdit = useCallback(() => {
    if (detail) populateDraft(detail);
    setMode('edit');
    setError(null);
  }, [detail, populateDraft]);

  const cancelEdit = useCallback(() => {
    setMode('view');
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!connectionId) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedConfig = normalizeConfigForSubmit(draftConfig, draftPlatformLabel);
      await api.patch(`/connections/${connectionId}`, {
        name: draftName.trim(),
        family: FAMILY_TO_ENUM[draftFamily],
        platformLabel: draftPlatformLabel.trim() || undefined,
        config: normalizedConfig,
      });
      // Reload detail
      const updated = await api.get<ConnectionDetail>(`/connections/${connectionId}`);
      setDetail(updated);
      populateDraft(updated);
      setMode('view');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection.');
    } finally {
      setSaving(false);
    }
  }, [connectionId, draftName, draftFamily, draftPlatformLabel, draftConfig, populateDraft, onSaved]);

  const handleTest = useCallback(async () => {
    if (!connectionId) return;
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await api.post<ConnectionTestResult>(`/connections/${connectionId}/test`, {});
      setTestResult(result);
      // Refresh detail to pick up updated test history
      const updated = await api.get<ConnectionDetail>(`/connections/${connectionId}`);
      setDetail(updated);
      populateDraft(updated);
      onSaved(); // refresh list too
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test connection failed.');
    } finally {
      setTesting(false);
    }
  }, [connectionId, populateDraft, onSaved]);

  // Delete
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!connectionId) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/connections/${connectionId}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection.');
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }, [connectionId, onDeleted, onClose]);

  const updateFamily = useCallback((next: ConnectionFamily) => {
    setDraftFamily(next);
    setDraftConfig(createDefaultConfig(next));
  }, []);

  const updateConfig = useCallback((updates: Partial<ConnectionConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...updates } as ConnectionConfig));
  }, []);

  // Derive display values
  const familyLabel = detail ? (ENUM_TO_FAMILY[detail.family] ?? detail.familyLabel) : '';
  const configForView = detail?.config as ConnectionConfig | undefined;
  const lastBearerToken = typeof testResult?.details?.bearerToken === 'string' ? testResult.details.bearerToken : undefined;
  const rows = useMemo(() => (configForView ? labelValueRows(configForView, lastBearerToken) : []), [configForView, lastBearerToken]);

  const panelClasses = isOpen ? 'translate-x-0' : 'translate-x-full';

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 top-16 z-40 bg-slate-900/25 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* drawer */}
      <aside
        className={`fixed right-0 top-16 z-50 bottom-0 w-full max-w-[560px] border-l border-border-soft bg-surface shadow-floating transition-transform ${panelClasses}`}
        role="dialog"
        aria-modal="true"
        aria-label="Connection details"
      >
        <div className="flex h-full flex-col">
          {/* header */}
          <header className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Connection</p>
              <h2 className="mt-1 truncate text-[20px] font-semibold text-text-main">
                {detail?.name ?? 'Loading…'}
              </h2>
              <p className="mt-1 text-sm text-text-muted">{familyLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-soft text-text-muted hover:bg-slate-50"
              aria-label="Close drawer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </header>

          {/* body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-text-muted">Loading connection…</span>
              </div>
            ) : !detail ? (
              error ? (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
              ) : null
            ) : mode === 'view' ? (
              <>
                {/* summary section */}
                <section className="rounded-lg border border-border-soft bg-background-light p-4">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Platform Label</dt>
                      <dd className="mt-1 text-sm text-text-main">{detail.platformLabel ?? '--'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Health</dt>
                      <dd className="mt-1">
                        {detail.testHistory.length > 0 ? (
                          <Badge
                            variant={detail.testHistory[0].status === 'healthy' ? 'success' : detail.testHistory[0].status === 'warning' ? 'warning' : 'danger'}
                            label={toDisplayHealth(detail.testHistory[0].status)}
                            dot
                          />
                        ) : (
                          <Badge variant="neutral" label="Untested" dot />
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Last Tested</dt>
                      <dd className="mt-1 text-sm text-text-main">
                        {detail.testHistory.length > 0 ? timeAgo(detail.testHistory[0].testedAt) : '--'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Used In</dt>
                      <dd className="mt-1 text-sm text-text-main">{detail.envBindings.length}</dd>
                    </div>
                  </dl>
                </section>

                {/* config section */}
                <section className="rounded-lg border border-border-soft bg-surface p-4">
                  <p className="text-sm font-semibold text-text-main">Configuration</p>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{row.label}</dt>
                        <dd className="mt-1 text-sm text-text-main">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* bearer token (OAuth connections) */}
                {configForView?.family === 'REST / OpenAPI outbound' && configForView.authMethod === 'OAuth 2.0' && (
                  <BearerTokenDisplay token={lastBearerToken} />
                )}

                {/* test history */}
                {detail.testHistory.length > 0 && (
                  <section className="rounded-lg border border-border-soft bg-surface p-4">
                    <p className="text-sm font-semibold text-text-main">Recent Test History</p>
                    <ul className="mt-3 space-y-2">
                      {detail.testHistory.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm">
                          <Badge
                            variant={t.status === 'healthy' ? 'success' : t.status === 'warning' ? 'warning' : 'danger'}
                            label={toDisplayHealth(t.status)}
                            dot
                          />
                          <span className="text-text-muted">{timeAgo(t.testedAt)}</span>
                          <span className="text-text-muted/70 truncate">{t.summaryMessage}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* inline test result */}
                {testResult && <TestResultBanner result={testResult} />}
              </>
            ) : (
              /* ---- edit mode ---- */
              <>
                <section className="rounded-lg border border-border-soft bg-background-light p-4">
                  <p className="text-sm font-semibold text-text-main">Core Details</p>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <TextField label="Connection Name" value={draftName} onChange={setDraftName} required />
                    <SelectField
                      label="Family / Type"
                      value={draftFamily}
                      options={[
                        'REST / OpenAPI outbound',
                        'Webhook / HTTP inbound',
                        'SFTP / File',
                        'Database',
                        'S3-compatible storage',
                      ]}
                      onChange={(v) => updateFamily(v as ConnectionFamily)}
                      required
                    />
                    <TextField
                      label="Platform Label (optional)"
                      value={draftPlatformLabel}
                      onChange={setDraftPlatformLabel}
                      placeholder="Coupa, SAP, Dynamics…"
                    />
                  </div>
                </section>

                <FamilySpecificEditor config={draftConfig} onChange={updateConfig} lastBearerToken={lastBearerToken} />

                {testResult && <TestResultBanner result={testResult} />}
              </>
            )}

            {/* error banner */}
            {error && !loading && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
            )}
          </div>

          {/* footer */}
          <footer className="border-t border-border-soft px-5 py-4">
            {confirmingDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-text-main">
                  Are you sure you want to delete <strong>{detail?.name}</strong>? This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-danger px-3.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            ) : mode === 'view' ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={!detail}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-danger/30 px-3.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !detail}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
                  >
                    {testing ? 'Testing…' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={switchToEdit}
                    disabled={!detail}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || saving}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
                >
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Test Result Banner                                                 */
/* ------------------------------------------------------------------ */

function TestResultBanner({ result }: { result: ConnectionTestResult }) {
  const isOk = result.status === 'healthy' || result.status === 'ok';
  const isWarning = result.status === 'warning';
  const variant = isOk
    ? 'border-success/30 bg-success/5 text-success'
    : isWarning
      ? 'border-amber-300/60 bg-amber-50 text-amber-700'
      : 'border-danger/30 bg-danger/5 text-danger';
  const testUrl = result.details?.testUrl as string | undefined;
  const baseUrl = result.details?.baseUrl as string | undefined;
  const testMethod = result.details?.testMethod as string | undefined;
  const httpStatus = result.details?.httpStatus as number | undefined;
  const noTestPath = !isOk && testUrl && baseUrl && testUrl.replace(/\/+$/, '') === baseUrl.replace(/\/+$/, '');
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variant}`}>
      <p className="font-semibold">{isOk ? 'Connection test passed' : isWarning ? 'Connection test warning' : 'Connection test failed'}</p>
      <p className="mt-1 text-text-muted">{result.summaryMessage}</p>
      {testUrl && (
        <p className="mt-1 font-mono text-xs text-text-muted/70 break-all">
          {testMethod ?? 'GET'} {testUrl}{httpStatus != null ? ` \u2192 ${httpStatus}` : ''}
        </p>
      )}
      {noTestPath && (
        <p className="mt-1 text-xs font-medium text-amber-600">
          Tip: No Test Path is configured — the test hit the bare Base URL. Add a Test Path (e.g. /api/status) in Edit mode.
        </p>
      )}
      {result.latencyMs != null && (
        <p className="mt-1 text-text-muted/70 text-xs">Latency: {result.latencyMs}ms</p>
      )}
    </div>
  );
}
