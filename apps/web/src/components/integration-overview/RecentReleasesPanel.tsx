import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { type RecentRelease, type IntegrationEnvironment } from './types';

interface RecentReleasesPanelProps {
  integrationId: string;
  releases: RecentRelease[];
  isDraft: boolean;
  environment: IntegrationEnvironment;
}

function releaseVariant(status: RecentRelease['status']): 'draft' | 'info' | 'success' {
  if (status === 'Draft') return 'draft';
  if (status === 'Approved') return 'info';
  return 'success';
}

function releaseStatusLabel(status: RecentRelease['status']): string {
  if (status === 'Live') return 'Deployed';
  if (status === 'Approved') return 'Approved';
  return 'Draft';
}

export function RecentReleasesPanel({ integrationId, releases, isDraft, environment }: RecentReleasesPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-soft/90 bg-background-light">
      <div className="border-b border-border-soft/80 px-5 py-3">
        <h3 className="text-[15px] font-semibold text-text-main">Recent Releases</h3>
        <p className="mt-0.5 text-[11px] text-text-muted">Scoped to {environment}</p>
      </div>

      {releases.length === 0 ? (
        <div className="px-5 py-5 text-center">
          <p className="text-[15px] font-semibold text-text-main">No releases yet</p>
          <p className="mt-1.5 text-sm text-text-muted">
            {isDraft
              ? `This version is not yet eligible for promotion from ${environment}.`
              : `Promotion history for ${environment} will appear here.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="px-5 py-3 text-left font-medium text-text-muted">Version</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Route</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Status</th>
                <th className="px-5 py-3 text-left font-medium text-text-muted">Time</th>
                <th className="px-5 py-3 text-right font-medium text-text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id} className="border-b border-border-soft last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 font-medium text-text-main">{release.version}</td>
                  <td className="px-5 py-2.5 text-text-muted">{release.path}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant={releaseVariant(release.status)} label={releaseStatusLabel(release.status)} />
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{release.time}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Link href={`/integrations/${integrationId}/releases`} className="text-[12px] font-semibold text-primary hover:underline">
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
