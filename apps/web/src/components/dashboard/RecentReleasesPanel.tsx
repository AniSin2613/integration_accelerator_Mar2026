import { Badge } from '@/components/ui/Badge';
import { type ReleaseRow } from './types';

interface RecentReleasesPanelProps {
  rows: ReleaseRow[];
}

function statusVariant(status: ReleaseRow['status']): 'success' | 'info' {
  return status === 'Live' ? 'success' : 'info';
}

export function RecentReleasesPanel({ rows }: RecentReleasesPanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Recent Releases</h3>
      </div>

      {rows.length === 0 ? (
        <div className="p-5 text-center">
          <p className="text-[16px] font-semibold text-text-main">No releases yet</p>
          <p className="text-sm text-text-muted mt-2">
            Releases will appear after integrations are promoted across environments
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="text-left px-5 py-3 text-text-muted font-medium">Release Name</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Path</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border-soft last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-text-main">{row.name}</td>
                  <td className="px-5 py-3 text-text-muted">{row.path}</td>
                  <td className="px-5 py-3"><Badge variant={statusVariant(row.status)} label={row.status} /></td>
                  <td className="px-5 py-3 text-text-muted">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
