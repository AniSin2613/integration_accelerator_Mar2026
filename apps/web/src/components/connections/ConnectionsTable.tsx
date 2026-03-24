import { Badge } from '@/components/ui/Badge';
import { type ConnectionRow, type ConnectionStatus } from './types';

interface ConnectionsTableProps {
  rows: ConnectionRow[];
  onView: (recordId: string) => void;
}

function statusVariant(status: ConnectionStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Healthy') return 'success';
  if (status === 'Warning') return 'warning';
  if (status === 'Failed') return 'danger';
  return 'neutral';
}

function NoMatchesState() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[16px] font-semibold text-text-main">No connections match the current filters</p>
      <p className="mt-2 text-sm text-text-muted">Adjust the search or filters to see connections again.</p>
    </div>
  );
}

export function ConnectionsTable({ rows, onView }: ConnectionsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-soft bg-surface shadow-soft">
      {rows.length === 0 ? (
        <NoMatchesState />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50">
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Connection Name</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Type / Family</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Platform Label</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Health</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Last Tested</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Updated</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Used In</th>
                  <th className="px-5 py-3 text-right font-medium text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-soft transition-colors last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-text-main">{row.name}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.family}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.platformLabel ?? '--'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(row.health)} label={row.health} dot />
                    </td>
                    <td className="px-5 py-3.5 text-text-muted tabular-nums">{row.lastTested}</td>
                    <td className="px-5 py-3.5 text-text-muted tabular-nums">{row.updated}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.usedIn}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onView(row.id)}
                        className="text-[12px] font-semibold text-primary hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-border-soft bg-background-light p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-text-main">{row.name}</h3>
                    <p className="mt-1 text-sm text-text-muted">{row.family}</p>
                  </div>
                  <Badge variant={statusVariant(row.health)} label={row.health} dot />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Platform Label</p>
                    <p className="mt-1 text-text-main">{row.platformLabel ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Used In</p>
                    <p className="mt-1 text-text-main">{row.usedIn}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Last Tested</p>
                    <p className="mt-1 text-text-main">{row.lastTested}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Updated</p>
                    <p className="mt-1 text-text-main">{row.updated}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-border-soft pt-3">
                  <button
                    type="button"
                    onClick={() => onView(row.id)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
