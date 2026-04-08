'use client';

import { useState, useEffect } from 'react';

interface MappingField {
  id: string;
  sourceField: string;
  targetField: string;
  transform: string;
  required?: boolean;
  transformConfig?: string;
}

interface TransformEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mappingId: string | null;
  mapping: MappingField | undefined;
  onSave: (transform: string, transformConfig?: string) => void;
}

const TRANSFORM_TYPES = [
  { id: 'direct', label: 'Direct', description: 'Pass through without transformation', icon: 'arrow_forward' },
  { id: 'lookup', label: 'Lookup', description: 'Map value using lookup table', icon: 'find_replace' },
  { id: 'concat', label: 'Concatenate', description: 'Combine multiple fields', icon: 'merge' },
  { id: 'formula', label: 'Formula', description: 'Apply custom expression', icon: 'function' },
  { id: 'dateFormat', label: 'Date Format', description: 'Convert date format', icon: 'calendar_today' },
  { id: 'uppercase', label: 'Uppercase', description: 'Convert to uppercase', icon: 'text_fields' },
  { id: 'lowercase', label: 'Lowercase', description: 'Convert to lowercase', icon: 'text_fields' },
  { id: 'trim', label: 'Trim', description: 'Remove whitespace', icon: 'space_bar' },
  { id: 'constant', label: 'Constant', description: 'Set constant value', icon: 'pin' },
  { id: 'conditional', label: 'Conditional', description: 'Conditional logic', icon: 'alt_route' },
];

const inputClasses =
  'w-full px-3 py-2 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20';

export function TransformEditorSheet({ isOpen, onClose, mappingId, mapping, onSave }: TransformEditorSheetProps) {
  const [selectedTransform, setSelectedTransform] = useState(mapping?.transform || 'direct');
  const [config, setConfig] = useState(mapping?.transformConfig || '');

  useEffect(() => {
    if (mapping) {
      setSelectedTransform(mapping.transform);
      setConfig(mapping.transformConfig || '');
    }
  }, [mapping, isOpen]);

  const handleSave = () => {
    onSave(selectedTransform, selectedTransform === 'direct' ? undefined : (config || undefined));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 bottom-0 w-full max-w-md border-l border-border-soft bg-surface shadow-floating transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border-soft px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Transform</p>
              <h2 className="mt-0.5 text-base font-semibold text-text-main">Edit Transform</h2>
              {mapping && (
                <p className="text-[12px] text-text-muted mt-1">
                  {mapping.sourceField} → {mapping.targetField}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft text-text-muted hover:bg-background-light"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">
            {/* Transform Type Grid */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">Transform Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFORM_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTransform(t.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      selectedTransform === t.id
                        ? 'border-primary bg-primary/5 shadow-soft'
                        : 'border-border-soft hover:border-border-soft hover:bg-background-light'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${
                      selectedTransform === t.id ? 'text-primary' : 'text-text-muted'
                    }`}>{t.icon}</span>
                    <div>
                      <p className={`text-[12px] font-semibold ${selectedTransform === t.id ? 'text-primary' : 'text-text-main'}`}>
                        {t.label}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration */}
            {selectedTransform !== 'direct' && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">Configuration</h3>
                <div className="rounded-lg border border-border-soft bg-background-light p-4 space-y-3">
                  {selectedTransform === 'lookup' && (
                    <>
                      <label className="block text-[12px] text-text-main font-medium">Lookup Table (JSON)</label>
                      <textarea
                        value={config}
                        onChange={(e) => setConfig(e.target.value)}
                        placeholder='{"value1": "mapped1", "value2": "mapped2"}'
                        className={`${inputClasses} font-mono`}
                        rows={4}
                      />
                    </>
                  )}
                  {selectedTransform === 'formula' && (
                    <>
                      <label className="block text-[12px] text-text-main font-medium">Formula Expression</label>
                      <textarea
                        value={config}
                        onChange={(e) => setConfig(e.target.value)}
                        placeholder="e.g., value * 1.1 or value.toUpperCase()"
                        className={`${inputClasses} font-mono`}
                        rows={3}
                      />
                    </>
                  )}
                  {selectedTransform === 'dateFormat' && (
                    <>
                      <label className="block text-[12px] text-text-main font-medium">From Format</label>
                      <input
                        type="text"
                        value={config.split('|')[0] || ''}
                        onChange={(e) => setConfig(`${e.target.value}|${config.split('|')[1] || 'YYYY-MM-DD'}`)}
                        placeholder="YYYY-MM-DD"
                        className={inputClasses}
                      />
                      <label className="block text-[12px] text-text-main font-medium mt-2">To Format</label>
                      <input
                        type="text"
                        value={config.split('|')[1] || ''}
                        onChange={(e) => setConfig(`${config.split('|')[0] || 'YYYY-MM-DD'}|${e.target.value}`)}
                        placeholder="DD/MM/YYYY"
                        className={inputClasses}
                      />
                    </>
                  )}
                  {selectedTransform === 'constant' && (
                    <>
                      <label className="block text-[12px] text-text-main font-medium">Constant Value</label>
                      <input
                        type="text"
                        value={config}
                        onChange={(e) => setConfig(e.target.value)}
                        placeholder="Enter constant value"
                        className={inputClasses}
                      />
                    </>
                  )}
                  {(selectedTransform === 'concat' || selectedTransform === 'conditional') && (
                    <>
                      <label className="block text-[12px] text-text-main font-medium">Expression</label>
                      <textarea
                        value={config}
                        onChange={(e) => setConfig(e.target.value)}
                        placeholder="Enter configuration..."
                        className={`${inputClasses} font-mono`}
                        rows={3}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border-soft px-5 py-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-text-muted hover:bg-background-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex h-8 items-center rounded-lg bg-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Save Transform
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
