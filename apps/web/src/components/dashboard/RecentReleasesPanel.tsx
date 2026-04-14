import Link from 'next/link';
import { type ConnectionRow } from './types';

interface ConnectionsPanelProps {
  rows: ConnectionRow[];
}

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'text-emerald-700 bg-emerald-50' },
  failing:  { label: 'Failing', className: 'text-red-700 bg-red-50' },
  untested: { label: 'Untested', className: 'text-slate-500 bg-slate-100' },
};

export function ConnectionsPanel({ rows }: ConnectionsPanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-text-main">Connections</h3>
        <Link href="/connections" className="text-[12px] font-medium text-primary hover:underline">View All</Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 px-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-text-muted/40">cable</span>
          <p className="text-[14px] font-semibold text-text-main mt-2">No connections configured</p>
          <p className="text-[13px] text-text-muted mt-1">Add a connection to start building integrations</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="text-left px-5 py-3 text-text-muted font-medium">Name</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Type</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">System</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Health</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Last Test</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = HEALTH_BADGE[row.health] ?? HEALTH_BADGE.untested;
                return (
                  <tr key={row.id} className="border-b border-border-soft last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-main">{row.name}</td>
                    <td className="px-5 py-3 text-text-muted">{row.type}</td>
                    <td className="px-5 py-3 text-text-muted">{row.system}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-muted">
                      {row.lastTest}
                      {row.latencyMs != null && row.health === 'healthy' && (
                        <span className="text-[11px] text-text-muted/60 ml-1">({row.latencyMs}ms)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
