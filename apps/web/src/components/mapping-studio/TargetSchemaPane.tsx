'use client';

import { useState, useMemo, useEffect } from 'react';

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
  businessName?: string | null;
  validationRule?: string | null;
  defaultValue?: string | null;
  source?: 'SCHEMA_PACK' | 'PROFILE';
}

interface TargetProfileInfo {
  id: string;
  name: string;
  system: string;
  object: string;
  isPublished: boolean;
}

interface TargetSchemaPaneProps {
  fields: StudioSchemaField[];
  mappedTargetFields: string[];
  unmappedRequired: StudioSchemaField[];
  highlightedFields?: Set<string>;
  onFieldHover?: (fieldPath: string | null) => void;
  onDrop: (sourceField: string, targetField: string) => void;
  onClickToMap?: (targetFieldPath: string) => void;
  targetProfileInfo?: TargetProfileInfo | null;
}

export function TargetSchemaPane({
  fields,
  mappedTargetFields,
  unmappedRequired,
  highlightedFields,
  onFieldHover,
  onDrop,
  onClickToMap,
  targetProfileInfo,
}: TargetSchemaPaneProps) {
  const [searchText, setSearchText] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [revealRows, setRevealRows] = useState(true);

  const isMapped = (f: StudioSchemaField) => mappedTargetFields.includes(f.path);
  const isUnmappedRequired = (f: StudioSchemaField) => f.required === true && !isMapped(f);
  const isHighlighted = (f: StudioSchemaField) => highlightedFields?.has(f.path) ?? false;

  // Filter by search
  const filteredFields = useMemo(() =>
    fields.filter(f =>
      f.path.toLowerCase().includes(searchText.toLowerCase()) ||
      f.label.toLowerCase().includes(searchText.toLowerCase())
    ), [fields, searchText]);

  const fieldRevealOrder = useMemo(
    () => new Map(filteredFields.map((f, i) => [f.path, i])),
    [filteredFields],
  );

  useEffect(() => {
    setRevealRows(false);
    const raf = requestAnimationFrame(() => setRevealRows(true));
    return () => cancelAnimationFrame(raf);
  }, [searchText]);

  // Split into 3 sections
  const requiredUnmapped = useMemo(() => filteredFields.filter(f => f.required && !mappedTargetFields.includes(f.path)), [filteredFields, mappedTargetFields]);
  const requiredMapped = useMemo(() => filteredFields.filter(f => f.required && mappedTargetFields.includes(f.path)), [filteredFields, mappedTargetFields]);
  const optional = useMemo(() => filteredFields.filter(f => !f.required), [filteredFields]);

  const typeColor: Record<string, string> = {
    string: 'text-blue-600', number: 'text-emerald-600', date: 'text-amber-600',
    boolean: 'text-orange-600', array: 'text-cyan-600', object: 'text-indigo-600',
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, fieldPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(fieldPath);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetField: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceFieldPath = e.dataTransfer?.getData?.('sourceFieldPath');
    if (sourceFieldPath) {
      onDrop(sourceFieldPath, targetField);
    }
    setDragOver(null);
  };

  const toggleSection = (section: string) => {
    const next = new Set(collapsedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setCollapsedSections(next);
  };

  const renderField = (field: StudioSchemaField) => {
    const mapped = isMapped(field);
    const unmappedReq = isUnmappedRequired(field);
    const highlighted = isHighlighted(field);
    const isDragTarget = dragOver === field.path;

    return (
      <div
        key={field.path}
        onDragOver={(e) => handleDragOver(e, field.path)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, field.path)}
        onMouseEnter={() => onFieldHover?.(field.path)}
        onMouseLeave={() => onFieldHover?.(null)}
        onClick={() => !mapped && onClickToMap?.(field.path)}
        className={`group flex items-start gap-1.5 border-l-2 px-3 py-2.5 transition-[background-color,border-color,transform,opacity,box-shadow] duration-300 motion-reduce:transition-none ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isDragTarget
            ? 'border-primary bg-primary/[0.12] shadow-[0_10px_24px_-18px_rgba(2,132,199,0.9)] scale-[1.012] -translate-y-[1px]'
            : highlighted
            ? 'border-primary bg-primary/8'
            : mapped
            ? 'border-success/60 bg-emerald-50/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
            : unmappedReq
            ? 'border-warning bg-amber-50/45 cursor-pointer'
            : 'border-transparent cursor-pointer hover:border-primary/25 hover:bg-white/90 hover:translate-x-[-1px]'
        } ${
          revealRows ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
        style={{ transitionDelay: `${Math.min((fieldRevealOrder.get(field.path) ?? 0) * 22, 180)}ms` }}
      >
        {mapped ? (
          <span className="material-symbols-outlined text-[12px] text-success shrink-0 mt-0.5">check_circle</span>
        ) : unmappedReq ? (
          <span className="material-symbols-outlined text-[12px] text-warning shrink-0 mt-0.5">warning</span>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[12px] font-semibold leading-4 text-text-main">
            {field.label}
            {field.required && <span className="text-warning ml-1 text-[10px]">*</span>}
          </p>
          <p className="truncate text-[10px] tracking-[0.01em] text-text-muted">{field.path}</p>
          {field.businessName && field.businessName !== field.path && field.businessName !== field.label && (
            <p className="text-[10px] text-primary/70 truncate">{field.businessName}</p>
          )}
          {field.validationRule && (
            <p className="text-[10px] text-purple-500/80 truncate font-mono" title={field.validationRule}>⚡ {field.validationRule}</p>
          )}
          {field.defaultValue && (
            <p className="text-[10px] text-text-muted/70 truncate">Default: {field.defaultValue}</p>
          )}
          {unmappedReq && !isDragTarget && (
            <p className="text-[10px] text-warning-text/70 mt-0.5 group-hover:text-primary transition-colors">
              Drop source here or click to map
            </p>
          )}
          {isDragTarget && (
            <p className="text-[10px] text-primary font-medium mt-0.5">Release to map</p>
          )}
        </div>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <span className={`text-[10px] font-medium ${typeColor[field.type] || 'text-text-muted'}`}>
            {field.type}
          </span>

        </div>
      </div>
    );
  };

  const renderSectionHeader = (label: string, key: string, count: number, icon: string, iconColor: string) => {
    const collapsed = collapsedSections.has(key);
    return (
      <button
        onClick={() => toggleSection(key)}
        className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-slate-300/70 bg-slate-100/90 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/95"
      >
        <span className="material-symbols-outlined text-[14px] text-text-muted">
          {collapsed ? 'chevron_right' : 'expand_more'}
        </span>
        <span className={`material-symbols-outlined text-[13px] ${iconColor}`}>{icon}</span>
        <span className="text-[11px] font-semibold tracking-[0.01em] text-text-main">{label}</span>
        <span className="ml-auto rounded-full border border-slate-300/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-text-muted">{count}</span>
      </button>
    );
  };

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-slate-300 bg-gradient-to-b from-slate-200/90 to-slate-100/80 backdrop-blur-md">
      {/* Header */}
      <div className="border-b border-slate-300/80 px-4 py-3.5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-semibold tracking-[0.01em] text-text-main">Target Fields</h2>
        </div>

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

      {/* Fields - 3 Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Section 1: Required & Unmapped — most prominent */}
        {requiredUnmapped.length > 0 && (
          <div>
            {renderSectionHeader('Required — Unmapped', 'req-unmapped', requiredUnmapped.length, 'warning', 'text-warning')}
            {!collapsedSections.has('req-unmapped') && (
              <div>{requiredUnmapped.map(renderField)}</div>
            )}
          </div>
        )}

        {/* Section 2: Required & Mapped */}
        {requiredMapped.length > 0 && (
          <div>
            {renderSectionHeader('Required — Mapped', 'req-mapped', requiredMapped.length, 'check_circle', 'text-success')}
            {!collapsedSections.has('req-mapped') && (
              <div>{requiredMapped.map(renderField)}</div>
            )}
          </div>
        )}

        {/* Section 3: Optional */}
        {optional.length > 0 && (
          <div>
            {renderSectionHeader('Optional', 'optional', optional.length, 'more_horiz', 'text-text-muted/50')}
            {!collapsedSections.has('optional') && (
              <div>{optional.map(renderField)}</div>
            )}
          </div>
        )}

        {filteredFields.length === 0 && (
          <div className="px-4 py-8 text-center">
            <span className="material-symbols-outlined text-[24px] text-text-muted/40">search_off</span>
            <p className="text-sm text-text-muted mt-1">No fields match &ldquo;{searchText}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-300/80 bg-slate-100/70 px-4 py-2 text-[11px] text-text-muted">
        {fields.length} fields &middot; {mappedTargetFields.length} mapped &middot; {unmappedRequired.length} required remaining
      </div>
    </div>
  );
}
