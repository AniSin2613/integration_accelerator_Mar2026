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
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Integrations Overview</h3>
      </div>

      {rows.length === 0 ? (
        <div className="py-5 px-6 text-center">
          <p className="text-[16px] font-semibold text-text-main">No integrations created yet</p>
          <p className="text-sm text-text-muted/50 mt-2 max-w-[560px] mx-auto">
            Start by adding a connection, selecting a template, or creating your first integration
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            <Link href="/connections" className="h-10 px-4 rounded-lg border border-border-soft text-sm font-semibold text-text-main hover:bg-slate-50 transition-colors flex items-center">
              Add Connection
            </Link>
            <Link href="/templates" className="h-10 px-4 rounded-lg border border-border-soft text-sm font-semibold text-text-main hover:bg-slate-50 transition-colors flex items-center">
              Browse Templates
            </Link>
            <Link href="/integrations" className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center">
              Create Integration
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-slate-50">
                <th className="text-left px-5 py-3 text-text-muted font-medium">Integration Name</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Template Type</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Environment</th>
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
                      <Link href="/integrations" className="text-[12px] font-medium text-primary hover:underline">View</Link>
                      <Link href="/monitoring" className="text-[12px] font-medium text-primary hover:underline">Open Monitoring</Link>
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
