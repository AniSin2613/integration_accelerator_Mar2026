import { type ActivityItem } from './types';

interface RecentActivityPanelProps {
  items: ActivityItem[];
}

export function RecentActivityPanel({ items }: RecentActivityPanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Recent Activity</h3>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-text-muted">No recent activity yet</div>
      ) : (
        <ul className="p-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border-soft bg-background-light px-3.5 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-text-muted mt-0.5">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-main leading-snug">{item.message}</p>
                <p className="text-[12px] text-text-muted mt-1">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
