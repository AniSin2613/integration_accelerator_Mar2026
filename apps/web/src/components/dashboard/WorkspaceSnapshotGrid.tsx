import { type KpiMetric, type KpiTone } from './types';

interface WorkspaceSnapshotGridProps {
  items: KpiMetric[];
}

const TONE_CLASSES: Record<KpiTone, string> = {
  neutral: 'text-text-main',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function WorkspaceSnapshotGrid({ items }: WorkspaceSnapshotGridProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold text-text-main">Workspace Snapshot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const tone = item.tone ?? 'neutral';
          return (
            <article key={item.id} className="rounded-xl border border-border-soft bg-surface py-3 px-4 shadow-soft">
              <p className="text-sm text-text-muted">{item.label}</p>
              <p className={`text-[22px] leading-none font-bold tabular-nums mt-1.5 ${TONE_CLASSES[tone]}`}>
                {item.value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
