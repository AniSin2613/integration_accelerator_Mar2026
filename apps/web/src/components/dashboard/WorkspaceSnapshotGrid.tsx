import { type DashboardKpis } from './types';

interface HealthChartsRowProps {
  kpis: DashboardKpis;
}

// Mock sparkline bars for run volume
const MOCK_BARS = [3, 5, 7, 12, 18, 15, 10, 8, 14, 20, 25, 22, 16, 11];
const MAX_BAR = Math.max(...MOCK_BARS);

export function HealthChartsRow({ kpis }: HealthChartsRowProps) {
  const rate = kpis.successRate ? parseFloat(kpis.successRate) : 95.2;
  const isMock = kpis.totalRuns === 0;
  const displayRate = isMock ? 95.2 : rate;

  // SVG ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayRate / 100) * circumference;
  const ringColor = displayRate >= 95 ? '#10b981' : displayRate >= 80 ? '#f59e0b' : '#ef4444';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Health Ring */}
      <div className="rounded-xl border border-border-soft bg-surface p-5 flex items-center gap-6">
        <div className="relative w-[130px] h-[130px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              stroke={ringColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-bold text-text-main tabular-nums">{displayRate}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-semibold text-text-main">Success Rate</h3>
          <p className="text-[13px] text-text-muted">
            {isMock ? 'No runs yet' : `${kpis.totalRuns} runs processed`}
          </p>
          {isMock && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
              <span className="material-symbols-outlined text-[12px]">info</span>
              Sample data
            </span>
          )}
        </div>
      </div>

      {/* Run Volume Sparkline */}
      <div className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-text-main">Run Volume</h3>
            <p className="text-[13px] text-text-muted mt-0.5">
              {isMock ? '142 runs · avg 4.2s' : `${kpis.totalRuns} runs · avg ${kpis.avgDurationSec ?? '--'}s`}
            </p>
          </div>
          {isMock && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">info</span>
              Sample data
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-muted/50 mt-1">Each bar = runs per day over the last 14 days</p>
        <div className="flex items-end gap-1.5 h-[80px] mt-2">
          {MOCK_BARS.map((val, i) => {
            const daysAgo = MOCK_BARS.length - 1 - i;
            const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70 hover:bg-primary transition-colors cursor-default group relative"
                style={{ height: `${(val / MAX_BAR) * 100}%` }}
                title={`${label}: ${val} runs`}
              >
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-white shadow-lg pointer-events-none z-10">
                  {val} runs
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] text-text-muted">14 days ago</span>
          <span className="text-[9px] text-text-muted">Today</span>
        </div>
      </div>
    </div>
  );
}
