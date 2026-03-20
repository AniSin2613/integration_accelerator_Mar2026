import { type IntegrationsSummary } from './types';

interface IntegrationsContextStripProps {
  summary: IntegrationsSummary;
}

export function IntegrationsContextStrip({ summary }: IntegrationsContextStripProps) {
  const items = [
    { label: 'Workspace', value: summary.workspace, clickable: false },
    { label: 'Environment', value: summary.environment, clickable: false },
    { label: 'Total Integrations', value: String(summary.totalIntegrations), clickable: true },
    { label: 'Healthy', value: String(summary.healthy), clickable: true },
    { label: 'Needs Attention', value: String(summary.needsAttention), clickable: true },
  ];

  return (
    <section className="rounded-xl border border-border-soft bg-surface px-5 py-2.5 sm:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:gap-5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`xl:border-r xl:border-border-soft xl:pr-5 last:border-r-0 ${
              item.clickable
                ? '-mx-1.5 rounded-lg px-1.5 py-1 cursor-pointer transition-colors hover:bg-slate-50'
                : ''
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{item.label}</p>
            <p className="mt-1 text-[14px] font-semibold text-text-main">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}