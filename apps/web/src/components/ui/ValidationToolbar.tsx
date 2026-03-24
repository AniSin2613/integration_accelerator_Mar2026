'use client';

/* ------------------------------------------------------------------ */
/*  ValidationToolbar – local toolbar for validation workbench         */
/* ------------------------------------------------------------------ */

import { type ValidationSeverity } from '@/components/builder/types';

export type ValidationFilter = 'all' | 'Error' | 'Warning' | 'Info' | 'blockers';

interface ValidationToolbarProps {
  filter: ValidationFilter;
  onFilterChange: (f: ValidationFilter) => void;
  totalCount: number;
  blockerCount: number;
  warningCount: number;
  onAddRule: () => void;
}

const FILTERS: { key: ValidationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Error', label: 'Errors' },
  { key: 'Warning', label: 'Warnings' },
  { key: 'Info', label: 'Info' },
  { key: 'blockers', label: 'Blockers Only' },
];

export function ValidationToolbar({
  filter, onFilterChange, totalCount, blockerCount, warningCount, onAddRule,
}: ValidationToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-soft bg-background-light">
      {/* Filters */}
      <div className="flex items-center rounded-md border border-border-soft bg-surface overflow-hidden">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`h-7 px-2.5 text-[11px] font-medium transition-colors border-r border-border-soft last:border-r-0 ${
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
      <div className="flex items-center gap-2 text-[11px] ml-1">
        <span className="text-text-muted">{totalCount} rules</span>
        {blockerCount > 0 && <span className="text-danger-text font-medium">{blockerCount} blockers</span>}
        {warningCount > 0 && <span className="text-warning-text font-medium">{warningCount} warnings</span>}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
        <span className="material-symbols-outlined text-[13px]">play_circle</span>Test Rules
      </button>
      <button
        type="button"
        onClick={onAddRule}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors"
      >
        <span className="material-symbols-outlined text-[13px]">add</span>Add Rule
      </button>
    </div>
  );
}
