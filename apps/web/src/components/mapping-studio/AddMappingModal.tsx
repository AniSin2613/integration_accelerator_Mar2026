'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
}

const TRANSFORM_TYPES = [
  { id: 'direct', label: 'Direct', icon: 'arrow_forward' },
  { id: 'lookup', label: 'Lookup', icon: 'find_replace' },
  { id: 'concat', label: 'Concatenate', icon: 'merge' },
  { id: 'formula', label: 'Formula', icon: 'function' },
  { id: 'dateFormat', label: 'Date Format', icon: 'calendar_today' },
  { id: 'uppercase', label: 'Uppercase', icon: 'text_fields' },
  { id: 'lowercase', label: 'Lowercase', icon: 'text_fields' },
  { id: 'trim', label: 'Trim', icon: 'space_bar' },
  { id: 'constant', label: 'Constant', icon: 'pin' },
  { id: 'conditional', label: 'Conditional', icon: 'alt_route' },
];

interface AddMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sourceField: string, targetField: string, transform: string, transformConfig?: string) => void;
  sourceFields: StudioSchemaField[];
  targetFields: StudioSchemaField[];
}

export function AddMappingModal({ isOpen, onClose, onSave, sourceFields, targetFields }: AddMappingModalProps) {
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedTransform, setSelectedTransform] = useState('direct');
  const [transformConfig, setTransformConfig] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const sourceRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const sourceDropRef = useRef<HTMLDivElement>(null);
  const targetDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSourceSearch('');
      setTargetSearch('');
      setSelectedSource('');
      setSelectedTarget('');
      setSelectedTransform('direct');
      setTransformConfig('');
      setShowAdvanced(false);
      setTimeout(() => sourceRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sourceDropRef.current && !sourceDropRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
      if (targetDropRef.current && !targetDropRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSource = useMemo(() =>
    sourceFields.filter(f =>
      f.label.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      f.path.toLowerCase().includes(sourceSearch.toLowerCase())
    ), [sourceFields, sourceSearch]);

  const filteredTarget = useMemo(() =>
    targetFields.filter(f =>
      f.label.toLowerCase().includes(targetSearch.toLowerCase()) ||
      f.path.toLowerCase().includes(targetSearch.toLowerCase())
    ), [targetFields, targetSearch]);

  const selectedSourceField = sourceFields.find(f => f.path === selectedSource);
  const selectedTargetField = targetFields.find(f => f.path === selectedTarget);

  const handleSave = () => {
    if (!selectedSource || !selectedTarget) return;
    onSave(selectedSource, selectedTarget, selectedTransform, transformConfig || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const typeColor: Record<string, string> = {
    string: 'text-blue-600', number: 'text-emerald-600', date: 'text-amber-600',
    boolean: 'text-orange-600', array: 'text-cyan-600', object: 'text-indigo-600',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onKeyDown={handleKeyDown}
      >
        <div className="w-full max-w-lg bg-surface rounded-xl border border-border-soft shadow-floating" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
            <div>
              <h2 className="text-base font-semibold text-text-main">Add Mapping</h2>
              <p className="text-[12px] text-text-muted mt-0.5">Select source and target fields to create a mapping</p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background-light text-text-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Source Field Picker */}
            <div ref={sourceDropRef} className="relative">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">Source Field</label>
              {selectedSourceField ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-success/40 bg-success-bg/30">
                  <span className="material-symbols-outlined text-[14px] text-success">input</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-main truncate">{selectedSourceField.label}</p>
                    <p className="text-[10px] text-text-muted truncate">{selectedSourceField.path}</p>
                  </div>
                  <span className={`text-[10px] font-medium ${typeColor[selectedSourceField.type] || 'text-text-muted'}`}>{selectedSourceField.type}</span>
                  <button onClick={() => { setSelectedSource(''); setSourceSearch(''); }} className="ml-1 text-text-muted hover:text-text-main"><span className="material-symbols-outlined text-[14px]">close</span></button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">search</span>
                    <input
                      ref={sourceRef}
                      type="text"
                      placeholder="Search source fields…"
                      value={sourceSearch}
                      onChange={(e) => { setSourceSearch(e.target.value); setSourceDropdownOpen(true); }}
                      onFocus={() => setSourceDropdownOpen(true)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  {sourceDropdownOpen && (
                    <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border-soft bg-surface shadow-floating scrollbar-thin">
                      {filteredSource.length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-text-muted text-center">No matching source fields</p>
                      ) : filteredSource.map(f => (
                        <button
                          key={f.path}
                          onClick={() => { setSelectedSource(f.path); setSourceSearch(''); setSourceDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/5 transition-colors border-b border-border-subtle last:border-b-0"
                        >
                          <span className="material-symbols-outlined text-[13px] text-text-muted/50">input</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-text-main truncate">{f.label}</p>
                            <p className="text-[10px] text-text-muted truncate">{f.path}</p>
                          </div>
                          <span className={`text-[10px] font-medium ${typeColor[f.type] || 'text-text-muted'}`}>{f.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <span className="material-symbols-outlined text-[18px] text-text-muted/30">arrow_downward</span>
            </div>

            {/* Target Field Picker */}
            <div ref={targetDropRef} className="relative">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">Target Field</label>
              {selectedTargetField ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${selectedTargetField.required ? 'border-warning/40 bg-warning-bg/30' : 'border-success/40 bg-success-bg/30'}`}>
                  <span className="material-symbols-outlined text-[14px] text-success">output</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-main truncate">
                      {selectedTargetField.label}
                      {selectedTargetField.required && <span className="text-warning ml-1 text-[10px]">*</span>}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">{selectedTargetField.path}</p>
                  </div>
                  <span className={`text-[10px] font-medium ${typeColor[selectedTargetField.type] || 'text-text-muted'}`}>{selectedTargetField.type}</span>
                  <button onClick={() => { setSelectedTarget(''); setTargetSearch(''); }} className="ml-1 text-text-muted hover:text-text-main"><span className="material-symbols-outlined text-[14px]">close</span></button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">search</span>
                    <input
                      ref={targetRef}
                      type="text"
                      placeholder="Search target fields…"
                      value={targetSearch}
                      onChange={(e) => { setTargetSearch(e.target.value); setTargetDropdownOpen(true); }}
                      onFocus={() => setTargetDropdownOpen(true)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  {targetDropdownOpen && (
                    <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border-soft bg-surface shadow-floating scrollbar-thin">
                      {filteredTarget.length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-text-muted text-center">No matching target fields</p>
                      ) : filteredTarget.map(f => (
                        <button
                          key={f.path}
                          onClick={() => { setSelectedTarget(f.path); setTargetSearch(''); setTargetDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/5 transition-colors border-b border-border-subtle last:border-b-0"
                        >
                          <span className="material-symbols-outlined text-[13px] text-text-muted/50">output</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-text-main truncate">
                              {f.label}
                              {f.required && <span className="text-warning ml-1 text-[10px]">*</span>}
                            </p>
                            <p className="text-[10px] text-text-muted truncate">{f.path}</p>
                          </div>
                          <span className={`text-[10px] font-medium ${typeColor[f.type] || 'text-text-muted'}`}>{f.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Transform Selector */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">Transform</label>
              <div className="flex flex-wrap gap-1.5">
                {TRANSFORM_TYPES.slice(0, showAdvanced ? TRANSFORM_TYPES.length : 5).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTransform(t.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                      selectedTransform === t.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border-soft bg-background-light text-text-muted hover:border-primary/30 hover:text-text-main'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
                {!showAdvanced && (
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-main transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">more_horiz</span>
                    More
                  </button>
                )}
              </div>
            </div>

            {/* Advanced config area */}
            {selectedTransform !== 'direct' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">Configuration</label>
                <textarea
                  value={transformConfig}
                  onChange={(e) => setTransformConfig(e.target.value)}
                  placeholder={
                    selectedTransform === 'formula' ? 'e.g., value * 1.1' :
                    selectedTransform === 'lookup' ? '{"sourceVal": "targetVal"}' :
                    selectedTransform === 'constant' ? 'Enter constant value' :
                    'Enter configuration…'
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border-soft bg-background-light text-[12px] text-text-main font-mono placeholder:text-text-muted/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Expert shortcut hint */}
            <p className="text-[10px] text-text-muted/60">
              Tip: You can also paste raw field paths directly into the search boxes
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-soft">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-text-muted hover:bg-background-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedSource || !selectedTarget}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Create Mapping
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
