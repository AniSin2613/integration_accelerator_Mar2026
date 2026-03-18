'use client';

import { useEffect, useState } from 'react';
import { KpiCard } from '@/components/ui/Card';
import { Badge, runStatusBadge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  durationMs: number | null;
  integration?: { name: string };
  integrationDef?: { name: string };
}

interface HealthSnapshot {
  id: string;
  uptimePct: number;
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  avgLatencyMs: number;
  snapshotAt: string;
  environment?: { name: string };
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkflowRun[]>('/runs?limit=8').catch(() => []),
      api.get<HealthSnapshot>('/runs/health-latest').catch(() => null),
    ]).then(([r, h]) => {
      setRuns(r);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  const uptime = health ? `${health.uptimePct.toFixed(1)}%` : '—';
  const totalRuns = health ? String(health.totalRuns) : '—';
  const failRate =
    health && health.totalRuns > 0
      ? `${((health.failureRuns / health.totalRuns) * 100).toFixed(1)}%`
      : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="System Uptime"
          value={uptime}
          icon="monitoring"
          iconColor="text-success"
          sub="Last 24 hours"
        />
        <KpiCard
          label="Total Runs Today"
          value={loading ? '…' : totalRuns}
          icon="sync"
          iconColor="text-accent-blue"
          sub="All environments"
        />
        <KpiCard
          label="Error Rate"
          value={loading ? '…' : failRate}
          icon="error_outline"
          iconColor="text-danger"
          sub="Failed / total runs"
        />
        <KpiCard
          label="Avg Latency"
          value={health ? `${health.avgLatencyMs}ms` : '—'}
          icon="speed"
          iconColor="text-warning"
          sub="End-to-end"
        />
      </div>

      {/* Recent runs table */}
      <div>
        <h2 className="text-lg font-semibold text-text-main mb-4">Recent Runs</h2>
        <div className="bg-surface rounded-xl border border-border-soft overflow-hidden shadow-soft">
          {loading ? (
            <div className="p-10 text-center text-text-muted text-sm">Loading…</div>
          ) : runs.length === 0 ? (
            <EmptyRuns />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-bg-canvas">
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Integration</th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">Started</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => {
                    const b = runStatusBadge(run.status);
                    return (
                      <tr
                        key={run.id}
                        className={`border-b border-border-soft last:border-0 hover:bg-bg-canvas/50 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-bg-canvas/30'
                        }`}
                      >
                        <td className="px-5 py-3 text-text-main font-medium">
                          {run.integration?.name ?? run.integrationDef?.name ?? run.id}
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
      </div>
    </div>
  );
}

function EmptyRuns() {
  return (
    <div className="p-12 flex flex-col items-center gap-3 text-center">
      <span className="material-symbols-outlined text-[48px] text-text-muted/40">sync_disabled</span>
      <p className="text-text-muted text-sm">No runs recorded yet. Deploy an integration to see activity here.</p>
    </div>
  );
}
