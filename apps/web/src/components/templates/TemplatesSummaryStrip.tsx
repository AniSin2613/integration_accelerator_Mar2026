import { type TemplatesSummary } from './types';

interface TemplatesSummaryStripProps {
  summary: TemplatesSummary;
}

export function TemplatesSummaryStrip({ summary }: TemplatesSummaryStripProps) {
  const items = [
    { label: 'Total Templates', value: String(summary.total) },
    { label: 'Prebuilt Templates', value: String(summary.prebuilt) },
    { label: 'Generic Templates', value: String(summary.generic) },
    { label: 'Recently Updated', value: String(summary.recentlyUpdated) },
  ];

  return (
    <section className="rounded-xl border border-border-soft bg-surface px-4 py-3 sm:px-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {items.map((item) => (
          <div key={item.label} className="xl:border-r xl:border-border-soft xl:pr-4 last:border-r-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{item.label}</p>
            <p className="mt-1 text-[16px] font-semibold text-text-main tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
