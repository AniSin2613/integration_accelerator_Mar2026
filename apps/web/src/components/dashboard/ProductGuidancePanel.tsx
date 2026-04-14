import { type FailureItem } from './types';

interface RecentFailuresPanelProps {
  items: FailureItem[];
}

export function RecentFailuresPanel({ items }: RecentFailuresPanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Recent Failures</h3>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center">
          <span className="material-symbols-outlined text-[28px] text-emerald-400">check_circle</span>
          <p className="text-[13px] text-text-muted mt-2">No recent failures</p>
        </div>
      ) : (
        <ul className="p-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-red-100 bg-red-50/50 px-3.5 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-red-500 mt-0.5">error</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-main leading-snug">{item.integration}</p>
                <p className="text-[12px] text-red-600 mt-0.5">{item.error}</p>
                <p className="text-[11px] text-text-muted mt-1">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
