import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { type RecentRun, type IntegrationStatus, type IntegrationEnvironment } from './types';

interface RecentRunsPanelProps {
  integrationId: string;
  runs: RecentRun[];
  isDraft: boolean;
  environment: IntegrationEnvironment;
}

function statusVariant(status: IntegrationStatus): 'success' | 'warning' | 'danger' | 'draft' | 'neutral' {
  if (status === 'Healthy') return 'success';
  if (status === 'Warning') return 'warning';
  if (status === 'Failed') return 'danger';
  if (status === 'Draft') return 'draft';
  return 'neutral';
}

export function RecentRunsPanel({ integrationId, runs, isDraft, environment }: RecentRunsPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-soft/90 bg-background-light">
      <div className="border-b border-border-soft/80 px-5 py-3">
        <h3 className="text-[15px] font-semibold text-text-main">Recent Runs</h3>
        <p className="mt-0.5 text-[11px] text-text-muted">Scoped to {environment}</p>
      </div>

      {runs.length === 0 ? (
        <div className="px-5 py-5 text-center">
          <p className="text-[15px] font-semibold text-text-main">No runs yet</p>
          <p className="mt-1.5 text-sm text-text-muted">
            {isDraft
              ? `This version is not deployed in ${environment}. Runs will appear after deployment.`
              : `Runs will appear as this integration executes in ${environment}.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="px-5 py-3 text-left font-medium text-text-muted">Run</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Status</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Started</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Duration</th>
                <th className="px-5 py-3 text-right font-medium text-text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-border-soft last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 text-text-main font-medium">{run.label}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant={statusVariant(run.status)} label={run.status} dot />
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{run.started}</td>
                  <td className="px-5 py-2.5 text-text-muted tabular-nums">{run.duration}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Link href="/monitoring" className="text-[12px] font-semibold text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
