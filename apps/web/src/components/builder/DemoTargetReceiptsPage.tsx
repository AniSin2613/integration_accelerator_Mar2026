'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface DemoTargetReceipt {
  id: string;
  targetType: 'JSON' | 'XML';
  targetName: string;
  mode: string;
  integrationDefId: string | null;
  testRunId: string | null;
  requestContentType: string | null;
  rawRequestBody: string;
  responseStatusCode: number;
  rawResponseBody: string;
  createdAt: string;
}

interface HistoricalTestRun {
  testRunId: string;
  createdAt?: string;
  status: string;
  summary: string;
  recordCounts?: { total: number; passed: number; failed: number };
  hasReceipt?: boolean;
}

export function DemoTargetReceiptsPage({ integrationId }: { integrationId: string }) {
  const [rows, setRows] = useState<DemoTargetReceipt[]>([]);
  const [history, setHistory] = useState<HistoricalTestRun[]>([]);
  const [loading, setLoading] = useState(true);

  const downloadReceipt = (row: DemoTargetReceipt) => {
    const extension = row.targetType === 'XML' ? 'xml' : 'json';
    const mimeType = row.targetType === 'XML' ? 'application/xml' : 'application/json';
    const timestamp = new Date(row.createdAt).toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([row.rawRequestBody], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.targetName || 'demo-target'}-${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [out, testRuns] = await Promise.all([
          api.get<DemoTargetReceipt[]>(`/demo-targets/receipts?integrationId=${encodeURIComponent(integrationId)}&limit=100`),
          api.get<HistoricalTestRun[]>(`/integrations/${encodeURIComponent(integrationId)}/test-runs?limit=100`),
        ]);
        if (!cancelled) {
          setRows(Array.isArray(out) ? out : []);
          setHistory(Array.isArray(testRuns) ? testRuns : []);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [integrationId]);

  return (
    <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
      <header>
        <h2 className="text-[18px] font-semibold text-text-main">Test Run History & Demo Target Receipts</h2>
        <p className="mt-1 text-sm text-text-muted">Review historical success/error runs here. Delivery receipts appear only when the target endpoint was actually called.</p>
      </header>

      {loading ? (
        <p className="text-sm text-text-muted">Loading test history…</p>
      ) : (
        <>
          <div className="rounded-lg border border-border-soft bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-semibold text-text-main">Historical E2E Test Runs</h3>
                <p className="text-[11px] text-text-muted">Includes both successful and failed runs, even when no receipt was generated.</p>
              </div>
              <Link
                href={`/integrations/${integrationId}/builder`}
                className="inline-flex items-center gap-1 rounded-md border border-border-soft bg-white px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                Open Builder
              </Link>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-text-muted">No historical test runs yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((run) => (
                  <div key={run.testRunId} className="rounded-md border border-border-soft bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${run.status === 'success' ? 'bg-emerald-50 text-emerald-700' : run.status === 'running' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
                        {run.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">{run.testRunId}</span>
                      {run.createdAt && <span className="text-[10px] text-text-muted">{new Date(run.createdAt).toLocaleString()}</span>}
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${run.hasReceipt ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                        {run.hasReceipt ? 'Receipt captured' : 'No receipt'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-main">{run.summary}</p>
                    {run.recordCounts && (
                      <p className="mt-1 text-[10px] text-text-muted">
                        Total {run.recordCounts.total} • Passed {run.recordCounts.passed} • Failed {run.recordCounts.failed}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">No demo target receipts yet. Failed runs may still appear in the history section above.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-soft">
              <table className="min-w-[960px] w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">When</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Target</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Test Run</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Payload Preview</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Resp Preview</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Download</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border-soft align-top">
                  <td className="px-3 py-2 text-xs text-text-muted">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${row.targetType === 'XML' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                      {row.targetType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-main">{row.targetName}</td>
                  <td className="px-3 py-2 text-xs font-mono text-text-muted">{row.testRunId ?? '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-text-main max-w-[280px] truncate" title={row.rawRequestBody}>{row.rawRequestBody}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${row.responseStatusCode >= 200 && row.responseStatusCode < 300 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {row.responseStatusCode}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-text-main max-w-[280px] truncate" title={row.rawResponseBody}>{row.rawResponseBody}</td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => downloadReceipt(row)}
                      className="inline-flex items-center gap-1 rounded-md border border-border-soft bg-white px-2 py-1 text-[11px] font-semibold text-text-main hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-[12px]">download</span>
                      {row.targetType}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
