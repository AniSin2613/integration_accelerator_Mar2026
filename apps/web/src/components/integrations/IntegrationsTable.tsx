"use client";

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { type IntegrationListRow, type IntegrationListStatus } from './types';

interface IntegrationsTableProps {
  rows: IntegrationListRow[];
  onDelete: (id: string) => Promise<void>;
}

function statusVariant(status: IntegrationListStatus): 'success' | 'warning' | 'danger' | 'draft' | 'neutral' {
  if (status === 'Healthy') return 'success';
  if (status === 'Warning') return 'warning';
  if (status === 'Failed') return 'danger';
  if (status === 'Draft') return 'draft';
  return 'neutral';
}

function NoMatchesState() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[16px] font-semibold text-text-main">No integrations match the current filters</p>
      <p className="mt-2 text-sm text-text-muted">Adjust the search or filters to see integrations again.</p>
    </div>
  );
}

export function IntegrationsTable({ rows, onDelete }: IntegrationsTableProps) {
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
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Integration Name</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Template Type</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Environment</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Last Run</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Last Updated</th>
                  <th className="px-5 py-3 text-left font-medium text-text-muted">Owner</th>
                  <th className="px-5 py-3 text-right font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-soft transition-colors last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-text-main">{row.name}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.templateType}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.environment}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(row.status)} label={row.status} dot />
                    </td>
                    <td className="px-5 py-3.5 text-text-muted tabular-nums">{row.lastRun}</td>
                    <td className="px-5 py-3.5 text-text-muted tabular-nums">{row.lastUpdated}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.owner}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3 text-[12px]">
                        <Link href={row.reviewHref} className="font-semibold text-primary hover:underline">
                          Review
                        </Link>
                        <Link href={row.builderHref} className="font-medium text-text-muted hover:text-text-main hover:underline">
                          Builder
                        </Link>
                        <Link href={row.releasesHref} className="font-medium text-text-muted hover:text-text-main hover:underline">
                          Releases
                        </Link>
                        <button
                          type="button"
                          className="font-medium text-danger hover:underline"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Delete \"${row.name}\"? This removes draft mappings, release history, and test traces.`,
                            );
                            if (!confirmed) return;
                            await onDelete(row.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
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
                    <p className="mt-1 text-sm text-text-muted">{row.templateType}</p>
                  </div>
                  <Badge variant={statusVariant(row.status)} label={row.status} dot />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Environment</p>
                    <p className="mt-1 text-text-main">{row.environment}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Last Run</p>
                    <p className="mt-1 text-text-main">{row.lastRun}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-soft pt-3">
                  <p className="text-sm text-text-muted">{row.owner}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <Link href={row.reviewHref} className="font-semibold text-primary hover:underline">
                      Review
                    </Link>
                    <Link href={row.builderHref} className="text-text-muted hover:text-text-main hover:underline">
                      Builder
                    </Link>
                    <Link href={row.releasesHref} className="text-text-muted hover:text-text-main hover:underline">
                      Releases
                    </Link>
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Delete \"${row.name}\"? This removes draft mappings, release history, and test traces.`,
                        );
                        if (!confirmed) return;
                        await onDelete(row.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}