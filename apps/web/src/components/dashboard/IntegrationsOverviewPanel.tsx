import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { type IntegrationRow } from './types';

interface IntegrationsOverviewPanelProps {
  rows: IntegrationRow[];
}

function statusVariant(status: IntegrationRow['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'Healthy') return 'success';
  if (status === 'Warning') return 'warning';
  return 'neutral';
}

export function IntegrationsOverviewPanel({ rows }: IntegrationsOverviewPanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-text-main">Integrations</h3>
        <Link href="/integrations" className="text-[12px] font-medium text-primary hover:underline">View All</Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 px-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-text-muted/40">integration_instructions</span>
          <p className="text-[14px] font-semibold text-text-main mt-2">No integrations yet</p>
          <p className="text-[13px] text-text-muted mt-1">
            Create your first integration to get started
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="text-left px-5 py-3 text-text-muted font-medium">Name</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Template</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Env</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Last Run</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                <th className="text-right px-5 py-3 text-text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border-soft last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-text-main">{row.name}</td>
                  <td className="px-5 py-3 text-text-muted">{row.templateType}</td>
                  <td className="px-5 py-3 text-text-muted">{row.environment}</td>
                  <td className="px-5 py-3 text-text-muted">{row.lastRun}</td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant(row.status)} label={row.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/integrations/${row.id}`} className="text-[12px] font-medium text-primary hover:underline">View</Link>
                      <Link href={`/integrations/${row.id}/builder`} className="text-[12px] font-medium text-primary hover:underline">Open Builder</Link>
                    </div>
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
