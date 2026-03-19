import Link from 'next/link';
import { type DashboardViewState, DASHBOARD_VIEW_STATES } from './types';

interface DashboardStateToggleProps {
  current: DashboardViewState;
}

export function DashboardStateToggle({ current }: DashboardStateToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-surface p-1">
      {DASHBOARD_VIEW_STATES.map((state) => {
        const isActive = state === current;
        return (
          <Link
            key={state}
            href={`/dashboard?view=${state}`}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-main hover:bg-slate-50'
            }`}
          >
            {state}
          </Link>
        );
      })}
    </div>
  );
}
