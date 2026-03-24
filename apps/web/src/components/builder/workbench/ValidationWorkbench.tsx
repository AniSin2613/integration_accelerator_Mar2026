'use client';

import { useState, useMemo } from 'react';
import { type ValidationConfig, type ValidationRule, type ValidationSeverity, type ValidationOnFailure } from '../types';
import { TextField, SelectField, CheckboxField, TextAreaField } from '@/components/ui/FormFields';
import { ValidationToolbar, type ValidationFilter } from '@/components/ui/ValidationToolbar';

/* ------------------------------------------------------------------ */
/*  ValidationWorkbench – rule board with toolbar                      */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLE: Record<ValidationSeverity, { bg: string; text: string; icon: string }> = {
  Error:   { bg: 'bg-danger-bg', text: 'text-danger-text', icon: 'error' },
  Warning: { bg: 'bg-warning-bg', text: 'text-warning-text', icon: 'warning' },
  Info:    { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'info' },
};

const SEVERITIES: ValidationSeverity[] = ['Error', 'Warning', 'Info'];
const ON_FAILURE_ACTIONS: ValidationOnFailure[] = ['Reject Record', 'Skip Record', 'Flag & Continue'];

interface ValidationWorkbenchProps {
  config: ValidationConfig;
  onChange: (config: ValidationConfig) => void;
  selectedRuleId: string | null;
  onSelectRule: (id: string | null) => void;
}

export function ValidationWorkbench({ config, onChange, selectedRuleId, onSelectRule }: ValidationWorkbenchProps) {
  const [filter, setFilter] = useState<ValidationFilter>('all');

  const addRule = () => {
    const next: ValidationRule = { id: `vr${Date.now()}`, name: '', condition: '', severity: 'Error', onFailure: 'Reject Record', enabled: true };
    onChange({ ...config, rules: [...config.rules, next] });
    onSelectRule(next.id);
  };

  const duplicateRule = (rule: ValidationRule) => {
    const dup: ValidationRule = { ...rule, id: `vr${Date.now()}`, name: `${rule.name} (copy)` };
    onChange({ ...config, rules: [...config.rules, dup] });
    onSelectRule(dup.id);
  };

  const removeRule = (id: string) => {
    onChange({ ...config, rules: config.rules.filter((r) => r.id !== id) });
    if (selectedRuleId === id) onSelectRule(null);
  };

  const toggleRule = (id: string) => {
    onChange({ ...config, rules: config.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) });
  };

  const updateRule = (id: string, patch: Partial<ValidationRule>) => {
    onChange({ ...config, rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const selectedRule = selectedRuleId ? config.rules.find((r) => r.id === selectedRuleId) ?? null : null;
  const blockerCount = config.rules.filter((r) => r.severity === 'Error' && r.enabled).length;
  const warningCount = config.rules.filter((r) => r.severity === 'Warning' && r.enabled).length;

  const filteredRules = useMemo(() => {
    if (filter === 'all') return config.rules;
    if (filter === 'blockers') return config.rules.filter((r) => r.severity === 'Error' && r.enabled);
    return config.rules.filter((r) => r.severity === filter);
  }, [config.rules, filter]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <ValidationToolbar
        filter={filter}
        onFilterChange={setFilter}
        totalCount={config.rules.length}
        blockerCount={blockerCount}
        warningCount={warningCount}
        onAddRule={addRule}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Rule list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2 space-y-1">
          {config.rules.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-text-muted/15">rule</span>
              <p className="text-[12px] text-text-muted">No validation rules yet</p>
              <p className="text-[11px] text-text-muted/70 max-w-sm">Add rules to enforce data quality before sending records to the target.</p>
              <button type="button" onClick={addRule} className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80">
                <span className="material-symbols-outlined text-[14px]">add</span>Create first rule
              </button>
            </div>
          )}
          {filteredRules.length === 0 && config.rules.length > 0 && (
            <p className="text-[12px] text-text-muted text-center py-6">No rules match current filter</p>
          )}
          {filteredRules.map((rule) => {
            const isSelected = rule.id === selectedRuleId;
            const sev = SEVERITY_STYLE[rule.severity];
            return (
              <button key={rule.id} type="button" onClick={() => onSelectRule(isSelected ? null : rule.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
                  isSelected ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15' : 'border-border-soft bg-surface hover:border-primary/20 hover:shadow-soft'
                }`}
              >
                {/* Toggle */}
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                  className={`flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-slate-200'}`}
                  aria-label={rule.enabled ? 'Disable' : 'Enable'}
                >
                  <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-[17px]' : 'translate-x-[2px]'}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold truncate ${rule.enabled ? 'text-text-main' : 'text-text-muted'}`}>{rule.name || 'Unnamed rule'}</p>
                  {rule.condition && <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">{rule.condition}</p>}
                </div>

                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${sev.bg} ${sev.text}`}>
                  <span className="material-symbols-outlined text-[11px]">{sev.icon}</span>{rule.severity}
                </span>

                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-text-muted">{rule.onFailure}</span>

                <button type="button" onClick={(e) => { e.stopPropagation(); duplicateRule(rule); }}
                  className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-slate-100 hover:text-primary transition-colors"
                  aria-label="Duplicate rule"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                </button>

                <button type="button" onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                  className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-slate-100 hover:text-danger transition-colors"
                  aria-label="Remove rule"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              </button>
            );
          })}
        </div>

        {/* Local inspector: selected rule detail */}
        {selectedRule && (
          <div className="w-[260px] flex-none border-l border-border-soft bg-surface overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80">Rule Detail</p>
              <button type="button" onClick={() => onSelectRule(null)} className="inline-flex h-5 w-5 items-center justify-center rounded text-text-muted hover:text-text-main hover:bg-slate-50" aria-label="Close detail">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
            <div className="px-3 py-2.5 space-y-2.5">
              <TextField label="Rule Name" value={selectedRule.name} onChange={(v) => updateRule(selectedRule.id, { name: v })} placeholder="Amount must be positive" />
              <TextAreaField label="Condition" value={selectedRule.condition} onChange={(v) => updateRule(selectedRule.id, { condition: v })} placeholder="record.total_amount > 0" rows={2} />
              <SelectField label="Severity" value={selectedRule.severity} options={SEVERITIES} onChange={(v) => updateRule(selectedRule.id, { severity: v })} />
              <SelectField label="On Failure" value={selectedRule.onFailure} options={ON_FAILURE_ACTIONS} onChange={(v) => updateRule(selectedRule.id, { onFailure: v })} />
              <CheckboxField label="Rule enabled" checked={selectedRule.enabled} onChange={(v) => updateRule(selectedRule.id, { enabled: v })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
