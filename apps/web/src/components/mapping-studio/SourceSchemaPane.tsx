'use client';

import { useState, useEffect, useRef } from 'react';

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
}

interface SourceSchemaPaneProps {
  fields: StudioSchemaField[];
  mappedSourceFields: string[];
  highlightedFields?: Set<string>;
  onFieldHover?: (fieldPath: string | null) => void;
  sourcePickerOpen?: boolean;
  onSourcePicked?: (fieldPath: string) => void;
  onSourcePickerClose?: () => void;
}

export function SourceSchemaPane({
  fields,
  mappedSourceFields,
  highlightedFields,
  onFieldHover,
  sourcePickerOpen,
  onSourcePicked,
  onSourcePickerClose,
}: SourceSchemaPaneProps) {
  const [searchText, setSearchText] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [revealRows, setRevealRows] = useState(true);
  const pickerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const groups = new Set(fields.map(f => f.group));
    setExpandedGroups(groups);
  }, [fields]);

  useEffect(() => {
    if (sourcePickerOpen) {
      setPickerSearch('');
      setTimeout(() => pickerInputRef.current?.focus(), 50);
    }
  }, [sourcePickerOpen]);

  useEffect(() => {
    setRevealRows(false);
    const raf = requestAnimationFrame(() => setRevealRows(true));
    return () => cancelAnimationFrame(raf);
  }, [searchText]);

  const filteredFields = fields.filter(f =>
    f.path.toLowerCase().includes(searchText.toLowerCase()) ||
    f.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const groupedFields = filteredFields.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, StudioSchemaField[]>);

  const fieldRevealOrder = new Map(filteredFields.map((f, i) => [f.path, i]));

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  const typeColor: Record<string, string> = {
    string: 'text-blue-600',
    number: 'text-emerald-600',
    date: 'text-amber-600',
    boolean: 'text-orange-600',
    array: 'text-cyan-600',
    object: 'text-indigo-600',
  };

  const isMapped = (f: StudioSchemaField) => mappedSourceFields.includes(f.path);
  const isHighlighted = (f: StudioSchemaField) => highlightedFields?.has(f.path) ?? false;

  // Picker-mode filtered fields
  const pickerFields = fields.filter(f =>
    f.path.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    f.label.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="relative flex w-72 shrink-0 flex-col border-r border-slate-300 bg-gradient-to-b from-slate-200/90 to-slate-100/80 backdrop-blur-md">
      {/* Header */}
      <div className="border-b border-slate-300/80 px-4 py-3.5">
        <h2 className="mb-2 text-[13px] font-semibold tracking-[0.01em] text-text-main">Source Fields</h2>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">search</span>
          <input
            type="text"
            placeholder="Search fields..."
            className="w-full rounded-lg border border-slate-300/80 bg-white/90 py-1.5 pl-7 pr-2.5 text-[12px] text-text-main placeholder:text-text-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.entries(groupedFields).map(([group, groupFields]) => (
          <div key={group}>
            <button
              onClick={() => toggleGroup(group)}
              className="sticky top-0 z-10 flex w-full items-center gap-2.5 border-b border-slate-300/70 bg-slate-100/90 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/95"
            >
              <span className="material-symbols-outlined text-[14px] text-text-muted">
                {expandedGroups.has(group) ? 'expand_more' : 'chevron_right'}
              </span>
              <span className="text-[11px] font-semibold tracking-[0.01em] text-text-main">{group}</span>
              <span className="ml-auto rounded-full border border-slate-300/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-text-muted">{groupFields.length}</span>
            </button>

            {expandedGroups.has(group) && (
                <div className="ml-3 border-l border-slate-300/60">
                {groupFields.map((field) => (
                  <div
                    key={field.path}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('sourceFieldPath', field.path);
                      e.dataTransfer.setData('sourceFieldLabel', field.label);
                      e.dataTransfer.effectAllowed = 'link';
                    }}
                    onMouseEnter={() => onFieldHover?.(field.path)}
                    onMouseLeave={() => onFieldHover?.(null)}
                    className={`group -ml-px flex cursor-grab items-center gap-1.5 border-l-2 px-3 py-2.5 transition-[background-color,border-color,transform,opacity,box-shadow] duration-300 motion-reduce:transition-none ease-[cubic-bezier(0.22,1,0.36,1)] active:cursor-grabbing active:opacity-80 ${
                      isHighlighted(field)
                        ? 'border-primary bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
                        : isMapped(field)
                        ? 'border-success/60 bg-emerald-50/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                        : 'border-transparent hover:border-primary/25 hover:bg-white/95 hover:translate-x-[1px]'
                    } ${
                      revealRows ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                    }`}
                    style={{ transitionDelay: `${Math.min((fieldRevealOrder.get(field.path) ?? 0) * 22, 180)}ms` }}
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-muted/30 group-hover:text-primary/60 shrink-0 transition-colors">drag_indicator</span>
                    {isMapped(field) && (
                      <span className="material-symbols-outlined text-[12px] text-success shrink-0">check_circle</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-4 text-text-main">{field.label}</p>
                      <p className="truncate text-[10px] tracking-[0.01em] text-text-muted">{field.path}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${typeColor[field.type] || 'text-text-muted'}`}>
                      {field.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredFields.length === 0 && (
          <div className="px-4 py-8 text-center">
            <span className="material-symbols-outlined text-[24px] text-text-muted/40">search_off</span>
            <p className="text-sm text-text-muted mt-1">No fields match &ldquo;{searchText}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-300/80 bg-slate-100/70 px-4 py-2 text-[11px] text-text-muted">
        {fields.length} fields &middot; {mappedSourceFields.length} mapped
      </div>

      {/* Source Picker Overlay (for click-to-map on target) */}
      {sourcePickerOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white/92 backdrop-blur-lg">
          <div className="border-b border-primary/30 bg-primary/8 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold tracking-[0.01em] text-primary">Pick a source field</p>
              <button
                onClick={onSourcePickerClose}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-background-light text-text-muted"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">search</span>
              <input
                ref={pickerInputRef}
                type="text"
                placeholder="Search source fields..."
                className="w-full rounded-lg border border-primary/30 bg-white/90 py-1.5 pl-7 pr-2.5 text-[12px] text-text-main placeholder:text-text-muted/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {pickerFields.map(field => (
              <button
                key={field.path}
                onClick={() => onSourcePicked?.(field.path)}
                className="flex w-full items-center gap-2 border-b border-white/55 px-4 py-2.5 text-left transition-colors hover:bg-primary/[0.06]"
              >
                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">input</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-semibold text-text-main">{field.label}</p>
                  <p className="text-[10px] text-text-muted truncate">{field.path}</p>
                </div>
                <span className={`text-[10px] font-medium shrink-0 ${typeColor[field.type] || 'text-text-muted'}`}>{field.type}</span>
              </button>
            ))}
            {pickerFields.length === 0 && (
              <p className="text-sm text-text-muted text-center py-6">No matching fields</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
