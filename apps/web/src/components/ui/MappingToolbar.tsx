'use client';

/* ------------------------------------------------------------------ */
/*  MappingToolbar – local toolbar for mapping workbench               */
/* ------------------------------------------------------------------ */

export type MappingFilter = 'all' | 'mapped' | 'unmapped' | 'required';
export type MappingStudioMode = 'guided' | 'board';

interface MappingToolbarProps {
  mode: MappingStudioMode;
  onModeChange: (mode: MappingStudioMode) => void;
  search: string;
  onSearchChange: (v: string) => void;
  filter: MappingFilter;
  onFilterChange: (f: MappingFilter) => void;
  onAddMapping: () => void;
  onSuggestMappings: () => void;
  onPreviewOutput: () => void;
  onValidateMappings: () => void;
  mappedCount: number;
  requiredCount: number;
  unmappedSourceCount: number;
  unmappedTargetCount: number;
  sourceLabel: string;
  targetLabel: string;
}

const FILTERS: { key: MappingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mapped', label: 'Mapped' },
  { key: 'unmapped', label: 'Unmapped' },
  { key: 'required', label: 'Required' },
];

export function MappingToolbar({
  mode,
  onModeChange,
  search, onSearchChange, filter, onFilterChange, onAddMapping,
  onSuggestMappings, onPreviewOutput, onValidateMappings,
  mappedCount, requiredCount, unmappedSourceCount, unmappedTargetCount,
  sourceLabel, targetLabel,
}: MappingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-soft bg-background-light px-4 py-2">
      <div className="mr-2">
        <h3 className="text-[14px] font-semibold text-text-main">Mapping &amp; Transform</h3>
        <p className="text-[11px] text-text-muted">
          {sourceLabel} <span className="mx-1">→</span> {targetLabel}
        </p>
      </div>

      <div className="flex items-center overflow-hidden rounded-md border border-border-soft bg-surface">
        <button
          type="button"
          onClick={() => onModeChange('guided')}
          className={`h-7 px-2.5 text-[11px] font-semibold ${mode === 'guided' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-50 hover:text-text-main'}`}
        >
          Guided Mapping
        </button>
        <button
          type="button"
          onClick={() => onModeChange('board')}
          className={`h-7 border-l border-border-soft px-2.5 text-[11px] font-semibold ${mode === 'board' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-50 hover:text-text-main'}`}
        >
          Full Mapping Board
        </button>
      </div>

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

      {/* Summary */}
      <div className="ml-1 flex items-center gap-1 text-[11px]">
        <span className="rounded border border-border-soft bg-surface px-2 py-1 text-text-main">{mappedCount} mapped</span>
        <span className="rounded border border-border-soft bg-surface px-2 py-1 text-text-main">{requiredCount} required</span>
        <span className="rounded border border-border-soft bg-surface px-2 py-1 text-text-main">{unmappedSourceCount} unmapped source</span>
        <span className={`rounded border px-2 py-1 ${unmappedTargetCount > 0 ? 'border-danger/30 bg-danger-bg/60 text-danger-text' : 'border-border-soft bg-surface text-text-main'}`}>
          {unmappedTargetCount} unmapped target
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button type="button" onClick={onSuggestMappings} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai/20 bg-ai-bg px-2.5 text-[11px] font-medium text-ai hover:bg-ai/10 transition-colors">
        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>Suggest Mappings
      </button>
      <button type="button" onClick={onPreviewOutput} className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:border-primary/30 hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[13px]">preview</span>Preview Output
      </button>
      <button type="button" onClick={onValidateMappings} className="inline-flex h-7 items-center gap-1 rounded-md border border-border-soft bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:border-primary/30 hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[13px]">check_circle</span>Validate Mappings
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
