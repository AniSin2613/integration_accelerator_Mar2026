'use client';

/* ------------------------------------------------------------------ */
/*  ValidationToolbar – local toolbar for validation workbench         */
/* ------------------------------------------------------------------ */

import { type ValidationSeverity } from '@/components/builder/types';

export type ValidationFilter = 'all' | 'Error' | 'Warning' | 'Info' | 'blockers' | 'auto';

interface ValidationToolbarProps {
  filter: ValidationFilter;
  onFilterChange: (f: ValidationFilter) => void;
  totalCount: number;
  blockerCount: number;
  warningCount: number;
  autoCount?: number;
  onAddRule: () => void;
}

const FILTERS: { key: ValidationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Error', label: 'Errors' },
  { key: 'Warning', label: 'Warnings' },
  { key: 'Info', label: 'Info' },
  { key: 'blockers', label: 'Blockers Only' },
  { key: 'auto', label: 'Auto' },
];

export function ValidationToolbar({
  filter, onFilterChange, totalCount, blockerCount, warningCount, autoCount, onAddRule,
}: ValidationToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border-soft bg-background-light px-4 py-3">
      {/* Filters */}
      <div className="flex items-center overflow-hidden rounded-[20px] border border-border-soft bg-surface">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`min-h-[42px] px-4 text-[13px] font-semibold transition-colors border-r border-border-soft last:border-r-0 ${
              filter === f.key
                ? 'bg-primary/8 text-primary'
                : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Counts */}
      <div className="ml-1 flex items-center gap-2 text-[13px]">
        <span className="text-text-muted">{totalCount} rules</span>
        {blockerCount > 0 && <span className="text-danger-text font-medium">{blockerCount} blockers</span>}
        {warningCount > 0 && <span className="text-warning-text font-medium">{warningCount} warnings</span>}
        {(autoCount ?? 0) > 0 && <span className="text-ai font-medium">{autoCount} auto</span>}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-[20px] border border-border-soft bg-surface px-4 text-[13px] font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary">
        <span className="material-symbols-outlined text-[15px]">play_circle</span>Test Rules
      </button>
      <button
        type="button"
        onClick={onAddRule}
        className="inline-flex h-10 items-center gap-1.5 rounded-[20px] bg-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
      >
        <span className="material-symbols-outlined text-[15px]">add</span>Add Rule
      </button>
    </div>
  );
}
