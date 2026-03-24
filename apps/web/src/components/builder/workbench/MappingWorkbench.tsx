'use client';

import { useState, useMemo } from 'react';
import { type MappingConfig, type MappingField } from '../types';
import { DEMO_SOURCE_FIELDS, DEMO_TARGET_FIELDS } from '../mockData';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormFields';
import { MappingToolbar, type MappingFilter } from '@/components/ui/MappingToolbar';

/* ------------------------------------------------------------------ */
/*  MappingWorkbench – 3-column mapping studio with toolbar            */
/* ------------------------------------------------------------------ */

const TRANSFORMS = ['direct', 'lookup', 'dateFormat(YYYYMMDD)', 'dateFormat(ISO8601)', 'uppercase', 'lowercase', 'trim', 'constant', 'expression'];

interface MappingWorkbenchProps {
  config: MappingConfig;
  onChange: (config: MappingConfig) => void;
  selectedMappingId: string | null;
  onSelectMapping: (id: string | null) => void;
}

export function MappingWorkbench({ config, onChange, selectedMappingId, onSelectMapping }: MappingWorkbenchProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MappingFilter>('all');

  const addMapping = () => {
    const next: MappingField = { id: `m${Date.now()}`, sourceField: '', targetField: '', transform: 'direct', required: false };
    onChange({ ...config, mappings: [...config.mappings, next] });
    onSelectMapping(next.id);
  };

  const removeMapping = (id: string) => {
    onChange({ ...config, mappings: config.mappings.filter((m) => m.id !== id) });
    if (selectedMappingId === id) onSelectMapping(null);
  };

  const updateMapping = (id: string, patch: Partial<MappingField>) => {
    onChange({ ...config, mappings: config.mappings.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  };

  const mappedSourceFields = new Set(config.mappings.map((m) => m.sourceField));
  const mappedTargetFields = new Set(config.mappings.map((m) => m.targetField));
  const selectedMapping = selectedMappingId ? config.mappings.find((m) => m.id === selectedMappingId) ?? null : null;

  const filteredMappings = useMemo(() => {
    let result = config.mappings;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.sourceField.toLowerCase().includes(q) || m.targetField.toLowerCase().includes(q));
    }
    if (filter === 'required') result = result.filter((m) => m.required);
    return result;
  }, [config.mappings, search, filter]);

  const filteredSourceFields = useMemo(() => {
    let fields = DEMO_SOURCE_FIELDS;
    if (search) { const q = search.toLowerCase(); fields = fields.filter((f) => f.toLowerCase().includes(q)); }
    if (filter === 'mapped') fields = fields.filter((f) => mappedSourceFields.has(f));
    if (filter === 'unmapped') fields = fields.filter((f) => !mappedSourceFields.has(f));
    return fields;
  }, [search, filter, mappedSourceFields]);

  const filteredTargetFields = useMemo(() => {
    let fields = DEMO_TARGET_FIELDS;
    if (search) { const q = search.toLowerCase(); fields = fields.filter((f) => f.toLowerCase().includes(q)); }
    if (filter === 'mapped') fields = fields.filter((f) => mappedTargetFields.has(f));
    if (filter === 'unmapped') fields = fields.filter((f) => !mappedTargetFields.has(f));
    return fields;
  }, [search, filter, mappedTargetFields]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <MappingToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onAddMapping={addMapping}
        mappedCount={config.mappings.length}
        unmappedCount={config.unmappedTargetFields.length}
        requiredCount={config.mappings.filter((m) => m.required).length}
      />

      {/* 3-column studio */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: source fields */}
        <div className="w-[190px] flex-none border-r border-border-soft bg-background-light overflow-y-auto scrollbar-thin">
          <div className="px-3 py-1.5 border-b border-border-soft sticky top-0 bg-background-light z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80">Source Fields</p>
          </div>
          <div className="px-1 py-0.5">
            {filteredSourceFields.map((f) => {
              const isMapped = mappedSourceFields.has(f);
              const isUnmapped = config.unmappedSourceFields.includes(f);
              return (
                <div key={f} className={`flex items-center gap-1.5 rounded px-2 py-[3px] text-[11px] font-mono ${isMapped ? 'text-text-main' : isUnmapped ? 'text-warning-text bg-warning-bg/40' : 'text-text-muted'}`}>
                  {isMapped ? (
                    <span className="material-symbols-outlined text-[11px] text-success">check_circle</span>
                  ) : isUnmapped ? (
                    <span className="material-symbols-outlined text-[11px] text-warning">warning</span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  {f}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: mapping rows */}
        <div className="flex-1 overflow-y-auto scrollbar-thin bg-background-light/50">
          <div className="px-3 py-1.5 space-y-1">
            {filteredMappings.length === 0 && config.mappings.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted/15">schema</span>
                <p className="text-[12px] text-text-muted">No field mappings yet</p>
                <button type="button" onClick={addMapping} className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80">
                  <span className="material-symbols-outlined text-[14px]">add</span>Add first mapping
                </button>
              </div>
            )}
            {filteredMappings.length === 0 && config.mappings.length > 0 && (
              <p className="text-[12px] text-text-muted text-center py-6">No mappings match current filter</p>
            )}
            {filteredMappings.map((m) => {
              const isSelected = m.id === selectedMappingId;
              return (
                <button key={m.id} type="button" onClick={() => onSelectMapping(isSelected ? null : m.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-all ${
                    isSelected ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15' : 'border-border-soft bg-surface hover:border-primary/20 hover:bg-slate-50'
                  }`}
                >
                  {m.required && <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-danger-bg text-[9px] font-bold text-danger-text">*</span>}
                  <span className="flex-1 min-w-0 text-[11px] font-mono text-text-main truncate">{m.sourceField || 'source_field'}</span>
                  <span className="material-symbols-outlined text-[14px] text-text-muted/50 shrink-0">arrow_forward</span>
                  <span className="flex-1 min-w-0 text-[11px] font-mono text-text-main truncate">{m.targetField || 'TARGET_FIELD'}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-text-muted">{m.transform}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeMapping(m.id); }}
                    className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-slate-100 hover:text-danger transition-colors"
                    aria-label="Remove mapping"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: target fields */}
        <div className="w-[190px] flex-none border-l border-border-soft bg-background-light overflow-y-auto scrollbar-thin">
          <div className="px-3 py-1.5 border-b border-border-soft sticky top-0 bg-background-light z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80">Target Fields</p>
          </div>
          <div className="px-1 py-0.5">
            {filteredTargetFields.map((f) => {
              const isMapped = mappedTargetFields.has(f);
              const isUnmapped = config.unmappedTargetFields.includes(f);
              return (
                <div key={f} className={`flex items-center gap-1.5 rounded px-2 py-[3px] text-[11px] font-mono ${isMapped ? 'text-text-main' : isUnmapped ? 'text-danger-text bg-danger-bg/40' : 'text-text-muted'}`}>
                  {isMapped ? (
                    <span className="material-symbols-outlined text-[11px] text-success">check_circle</span>
                  ) : isUnmapped ? (
                    <span className="material-symbols-outlined text-[11px] text-danger">error</span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  {f}
                  {isUnmapped && <span className="text-danger-text text-[10px] font-bold ml-auto">*</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Local inspector: selected mapping detail */}
        {selectedMapping && (
          <div className="w-[240px] flex-none border-l border-border-soft bg-surface overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80">Mapping Detail</p>
              <button type="button" onClick={() => onSelectMapping(null)} className="inline-flex h-5 w-5 items-center justify-center rounded text-text-muted hover:text-text-main hover:bg-slate-50" aria-label="Close detail">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
            <div className="px-3 py-2.5 space-y-2.5">
              <TextField label="Source Field" value={selectedMapping.sourceField} onChange={(v) => updateMapping(selectedMapping.id, { sourceField: v })} placeholder="source_field" />
              <TextField label="Target Field" value={selectedMapping.targetField} onChange={(v) => updateMapping(selectedMapping.id, { targetField: v })} placeholder="TARGET_FIELD" />
              <SelectField label="Transform" value={selectedMapping.transform} options={TRANSFORMS} onChange={(v) => updateMapping(selectedMapping.id, { transform: v })} />
              <CheckboxField label="Required field" checked={selectedMapping.required} onChange={(v) => updateMapping(selectedMapping.id, { required: v })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
