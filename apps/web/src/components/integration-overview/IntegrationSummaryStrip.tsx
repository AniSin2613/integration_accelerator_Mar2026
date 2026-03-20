import { Badge } from '@/components/ui/Badge';
import { type IntegrationSummaryStripData } from './types';

interface IntegrationSummaryStripProps {
  summary: IntegrationSummaryStripData;
}

function statusVariant(status: IntegrationSummaryStripData['status']): 'draft' | 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Healthy') return 'success';
  if (status === 'Warning') return 'warning';
  if (status === 'Failed') return 'danger';
  if (status === 'Draft') return 'draft';
  return 'neutral';
}

export function IntegrationSummaryStrip({ summary }: IntegrationSummaryStripProps) {
  const items = [
    {
      label: 'Status',
      value: <Badge variant={statusVariant(summary.status)} label={summary.status} dot />,
    },
    { label: 'Source', value: summary.source },
    { label: 'Target', value: summary.target },
    { label: 'Last Run', value: summary.lastRun },
    { label: 'Last Deployment', value: summary.lastDeployment },
    { label: 'Owner', value: summary.owner },
  ];

  return (
    <section className="rounded-xl border border-border-soft bg-surface px-4 py-3 sm:px-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 xl:gap-4">
        {items.map((item) => (
          <div key={item.label} className="xl:border-r xl:border-border-soft xl:pr-4 last:border-r-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{item.label}</p>
            <div className="mt-1 text-[14px] font-semibold text-text-main">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
