'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  MappingToolbar – local toolbar for mapping workbench               */
/* ------------------------------------------------------------------ */

export type MappingFilter = 'all' | 'mapped' | 'unmapped' | 'required';

interface MappingToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: MappingFilter;
  onFilterChange: (f: MappingFilter) => void;
  onAddMapping: () => void;
  mappedCount: number;
  unmappedCount: number;
  requiredCount: number;
}

const FILTERS: { key: MappingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mapped', label: 'Mapped' },
  { key: 'unmapped', label: 'Unmapped' },
  { key: 'required', label: 'Required' },
];

export function MappingToolbar({
  search, onSearchChange, filter, onFilterChange, onAddMapping,
  mappedCount, unmappedCount, requiredCount,
}: MappingToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-soft bg-background-light">
      {/* Search */}
      <div className="relative flex-1 max-w-[240px]">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-text-muted/60">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search fields…"
          className="h-7 w-full rounded-md border border-border-soft bg-surface pl-8 pr-3 text-[12px] text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all"
        />
      </div>

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
        <span className="text-text-muted">{mappedCount} mapped</span>
        {unmappedCount > 0 && <span className="text-danger-text font-medium">{unmappedCount} unmapped</span>}
        <span className="text-text-muted">{requiredCount} req</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>Suggest
      </button>
      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
        <span className="material-symbols-outlined text-[13px]">preview</span>Preview
      </button>
      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
        <span className="material-symbols-outlined text-[13px]">check_circle</span>Validate
      </button>
      <button
        type="button"
        onClick={onAddMapping}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors"
      >
        <span className="material-symbols-outlined text-[13px]">add</span>Add Mapping
      </button>
    </div>
  );
}
