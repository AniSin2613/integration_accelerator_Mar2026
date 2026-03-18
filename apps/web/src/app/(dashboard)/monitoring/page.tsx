'use client';

import { useEffect, useState } from 'react';
import { KpiCard } from '@/components/ui/Card';
import { Badge, runStatusBadge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  integration?: { id: string; name: string };
  integrationDef?: { id: string; name: string };
  environment?: { name: string; type: string };
}

interface HealthSnapshot {
  uptimePct: number;
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  avgLatencyMs: number;
  p95LatencyMs: number | null;
  snapshotAt: string;
  environment?: { name: string };
}

interface PipelineSummary {
  id: string;
  name: string;
  status: string;
  updatedAt?: string | null;
}

export default function MonitoringPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState<'ALL' | 'DEV' | 'TEST' | 'PROD'>('ALL');

  useEffect(() => {
    Promise.all([
      api.get<WorkflowRun[]>('/runs?limit=20').catch(() => []),
      api.get<HealthSnapshot>('/runs/health-latest').catch(() => null),
      api.get<PipelineSummary[]>('/integrations').catch(() => []),
    ]).then(([r, h, p]) => {
      setRuns(r);
      setHealth(h);
      setPipelines(p);
      setLoading(false);
    });
  }, []);

  const filteredRuns =
    envFilter === 'ALL' ? runs : runs.filter((r) => r.environment?.type === envFilter);

  const errorRate =
    health && health.totalRuns > 0
      ? `${((health.failureRuns / health.totalRuns) * 100).toFixed(1)}%`
      : '0%';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Uptime"
          value={health ? `${health.uptimePct.toFixed(2)}%` : '—'}
          icon="verified"
          iconColor="text-success"
          sub="System availability"
        />
        <KpiCard
          label="Total Runs"
          value={health ? String(health.totalRuns) : '—'}
          icon="bolt"
          iconColor="text-accent-blue"
          sub="All time"
        />
        <KpiCard
          label="Error Rate"
          value={loading ? '…' : errorRate}
          icon="bug_report"
          iconColor="text-danger"
          sub={`${health?.failureRuns ?? 0} failures`}
        />
        <KpiCard
          label="Avg Latency"
          value={health ? `${health.avgLatencyMs}ms` : '—'}
          icon="timer"
          iconColor="text-warning"
          sub={health?.p95LatencyMs != null ? `p95: ${health.p95LatencyMs}ms` : undefined}
        />
      </div>

      {/* Active Pipelines */}
      <section>
        <h2 className="text-base font-semibold text-text-main mb-3">Active Pipelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {loading && (
            <div className="col-span-3 p-6 text-center text-text-muted text-sm">Loading…</div>
          )}
          {!loading && pipelines.length === 0 && (
            <div className="col-span-3 p-6 text-center text-text-muted text-sm bg-surface rounded-xl border border-border-soft">
              No integrations deployed yet.
            </div>
          )}
          {pipelines.map((p) => {
            const b = runStatusBadge(p.status);
            return (
              <div
                key={p.id}
                className="bg-surface rounded-xl border border-border-soft shadow-soft px-5 py-4 flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-[22px] text-accent-blue flex-shrink-0">account_tree</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-main text-sm truncate">{p.name}</p>
                  {p.updatedAt && (
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Updated: {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Badge variant={b.variant} label={b.label} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Run Log */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-main">Run Log</h2>
          <div className="flex items-center gap-2">
            {(['ALL', 'DEV', 'TEST', 'PROD'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEnvFilter(e)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  envFilter === e
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-muted border-border-soft hover:border-primary/30'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border-soft shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-text-muted text-sm">Loading runs…</div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-10 text-center text-text-muted text-sm">No runs in this environment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-bg-canvas">
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Integration</th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Env</th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Started</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((run, i) => {
                    const b = runStatusBadge(run.status);
                    return (
                      <tr
                        key={run.id}
                        className={`border-b border-border-soft last:border-0 hover:bg-bg-canvas/50 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-bg-canvas/30'
                        }`}
                      >
                        <td className="px-5 py-3 font-medium text-text-main">
                          {run.integration?.name ?? run.integrationDef?.name ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-bg-canvas border border-border-soft text-[11px] text-text-muted font-medium">
                            {run.environment?.type ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={b.variant} label={b.label} />
                        </td>
                        <td className="px-5 py-3 text-text-muted tabular-nums">
                          {new Date(run.startedAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-text-muted tabular-nums">
                          {run.durationMs != null ? `${run.durationMs}ms` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
