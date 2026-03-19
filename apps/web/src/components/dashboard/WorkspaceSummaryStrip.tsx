import { type WorkspaceSummary } from './types';

interface WorkspaceSummaryStripProps {
  summary: WorkspaceSummary;
}

export function WorkspaceSummaryStrip({ summary }: WorkspaceSummaryStripProps) {
  const items = [
    { label: 'Workspace', value: summary.workspace },
    { label: 'Environment', value: summary.environment },
    { label: 'Active Integrations', value: String(summary.activeIntegrations) },
    { label: 'Open Issues', value: String(summary.openIssues) },
    { label: 'Last Deployment', value: summary.lastDeployment },
  ];

  return (
    <section className="rounded-xl border border-border-soft bg-surface px-4 sm:px-5 py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item, index) => (
          <div key={item.label} className="xl:pr-4 xl:border-r xl:border-border-soft last:border-r-0">
            <p className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">{item.label}</p>
            <p className="text-[15px] font-semibold text-text-main mt-1">{item.value}</p>
            {index < 4 && <div className="hidden" />}
          </div>
        ))}
      </div>
    </section>
  );
}
