import { type AttentionMetric } from './types';

interface NeedsAttentionGridProps {
  items: AttentionMetric[];
}

const ICON_TINT: Record<AttentionMetric['id'], string> = {
  'failed-runs': 'text-danger bg-danger/10',
  'pending-approvals': 'text-warning bg-warning/10',
  'connection-issues': 'text-warning bg-warning/10',
  'replay-queue': 'text-accent-blue bg-accent-blue/10',
};

export function NeedsAttentionGrid({ items }: NeedsAttentionGridProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold text-text-main">Needs Attention</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <article key={item.id} className={`rounded-xl border border-border-soft bg-surface shadow-soft ${item.count === 0 ? 'py-3 px-4' : 'p-4'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ICON_TINT[item.id]}`}>
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              </div>
              {item.count > 0 && item.actionLabel && (
                <button type="button" className="text-[12px] font-medium text-text-muted hover:text-text-main transition-colors">
                  {item.actionLabel}
                </button>
              )}
            </div>
            <p className={`text-sm text-text-muted ${item.count === 0 ? 'mt-2.5' : 'mt-4'}`}>{item.label}</p>
            <p className="text-[30px] leading-none font-bold text-text-main mt-1 tabular-nums">{item.count}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
