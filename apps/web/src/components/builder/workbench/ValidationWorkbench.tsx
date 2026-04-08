'use client';

import { useState, useMemo } from 'react';
import {
  type ValidationConfig,
  type ValidationRule,
  type ValidationSeverity,
  type ValidationOperator,
  type ValidationErrorConfig,
  VALIDATION_OPERATORS,
} from '../types';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormFields';
import type { ValidationFilter } from '@/components/ui/ValidationToolbar';

/* ------------------------------------------------------------------ */
/*  ValidationWorkbench – structured rule builder + error handler      */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLE: Record<ValidationSeverity, { bg: string; text: string; icon: string }> = {
  Error:   { bg: 'bg-danger-bg', text: 'text-danger-text', icon: 'error' },
  Warning: { bg: 'bg-warning-bg', text: 'text-warning-text', icon: 'warning' },
  Info:    { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'info' },
};

const SEVERITIES: ValidationSeverity[] = ['Error', 'Warning', 'Info'];
const NOTIFY_CHANNELS: ValidationErrorConfig['notifyChannel'][] = ['None', 'Email', 'Slack', 'Teams'];

type WorkbenchTab = 'rules' | 'error-handler';

interface ValidationWorkbenchProps {
  config: ValidationConfig;
  onChange: (config: ValidationConfig) => void;
  selectedRuleId: string | null;
  onSelectRule: (id: string | null) => void;
  targetFields: string[];
  activeTab?: WorkbenchTab;
  onTabChange?: (tab: WorkbenchTab) => void;
}

/* ---- Operator helpers ---- */
function operatorNeedsValue(op: ValidationOperator): boolean {
  return VALIDATION_OPERATORS.find((o) => o.value === op)?.needsValue ?? true;
}

function operatorLabel(op: ValidationOperator): string {
  return VALIDATION_OPERATORS.find((o) => o.value === op)?.label ?? op;
}

/* ---- Test evaluator for structured rules ---- */
function evaluateRule(rule: ValidationRule, record: Record<string, unknown>): { passed: boolean; message: string } {
  const fieldValue = rule.field.split('.').reduce((o: any, k) => o?.[k], record);

  switch (rule.operator) {
    case 'IS_NOT_EMPTY': {
      const passed = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      return { passed, message: passed ? 'Passed' : `${rule.field} is empty` };
    }
    case 'EQUALS': {
      const passed = String(fieldValue) === String(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} ≠ ${rule.value}` };
    }
    case 'NOT_EQUALS': {
      const passed = String(fieldValue) !== String(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} = ${rule.value}` };
    }
    case 'GREATER_THAN': {
      const passed = Number(fieldValue) > Number(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} ≤ ${rule.value}` };
    }
    case 'LESS_THAN': {
      const passed = Number(fieldValue) < Number(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} ≥ ${rule.value}` };
    }
    case 'IN': {
      const list = Array.isArray(rule.value) ? rule.value : String(rule.value).split(',').map((s) => s.trim());
      const passed = list.includes(String(fieldValue));
      return { passed, message: passed ? 'Passed' : `${rule.field} not in [${list.join(', ')}]` };
    }
    case 'NOT_IN': {
      const list = Array.isArray(rule.value) ? rule.value : String(rule.value).split(',').map((s) => s.trim());
      const passed = !list.includes(String(fieldValue));
      return { passed, message: passed ? 'Passed' : `${rule.field} in [${list.join(', ')}]` };
    }
    case 'MATCHES': {
      try {
        const passed = new RegExp(String(rule.value)).test(String(fieldValue ?? ''));
        return { passed, message: passed ? 'Passed' : `${rule.field} doesn't match /${rule.value}/` };
      } catch {
        return { passed: false, message: 'Invalid regex' };
      }
    }
    case 'LENGTH_MIN': {
      const passed = String(fieldValue ?? '').length >= Number(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} length < ${rule.value}` };
    }
    case 'LENGTH_MAX': {
      const passed = String(fieldValue ?? '').length <= Number(rule.value);
      return { passed, message: passed ? 'Passed' : `${rule.field} length > ${rule.value}` };
    }
    default:
      return { passed: true, message: 'Unknown operator' };
  }
}

export function ValidationWorkbench({ config, onChange, selectedRuleId, onSelectRule, targetFields, activeTab: controlledTab, onTabChange }: ValidationWorkbenchProps) {
  const [filter, setFilter] = useState<ValidationFilter>('all');
  const [internalTab, setInternalTab] = useState<WorkbenchTab>('rules');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: WorkbenchTab) => { onTabChange ? onTabChange(tab) : setInternalTab(tab); };
  const [testPayload, setTestPayload] = useState('');
  const [testResults, setTestResults] = useState<{ ruleId: string; ruleName: string; passed: boolean; message: string }[] | null>(null);

  const addRule = () => {
    const next: ValidationRule = {
      id: `vr${Date.now()}`,
      name: '',
      field: targetFields[0] ?? '',
      operator: 'IS_NOT_EMPTY',
      value: '',
      severity: 'Error',
      enabled: true,
      source: 'manual',
    };
    onChange({ ...config, rules: [...config.rules, next] });
    onSelectRule(next.id);
  };

  const duplicateRule = (rule: ValidationRule) => {
    const dup: ValidationRule = { ...rule, id: `vr${Date.now()}`, name: `${rule.name} (copy)`, source: 'manual' };
    onChange({ ...config, rules: [...config.rules, dup] });
    onSelectRule(dup.id);
  };

  const removeRule = (id: string) => {
    const rule = config.rules.find((r) => r.id === id);
    if (rule?.source === 'auto') return;
    onChange({ ...config, rules: config.rules.filter((r) => r.id !== id) });
    if (selectedRuleId === id) onSelectRule(null);
  };

  const toggleRule = (id: string) => {
    onChange({ ...config, rules: config.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) });
  };

  const updateRule = (id: string, patch: Partial<ValidationRule>) => {
    onChange({ ...config, rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const updateErrorConfig = (patch: Partial<ValidationErrorConfig>) => {
    onChange({ ...config, errorConfig: { ...config.errorConfig, ...patch } });
  };


  const filteredRules = useMemo(() => {
    if (filter === 'all') return config.rules;
    if (filter === 'blockers') return config.rules.filter((r) => r.severity === 'Error' && r.enabled);
    if (filter === 'auto') return config.rules.filter((r) => r.source === 'auto');
    return config.rules.filter((r) => r.severity === filter);
  }, [config.rules, filter]);

  const runTest = () => {
    if (!testPayload.trim()) return;
    let record: Record<string, unknown>;
    try { record = JSON.parse(testPayload); } catch { setTestResults([{ ruleId: '', ruleName: '', passed: false, message: 'Invalid JSON payload' }]); return; }
    const results = config.rules.filter((r) => r.enabled).map((r) => {
      const { passed, message } = evaluateRule(r, record);
      return { ruleId: r.id, ruleName: r.name || 'Unnamed', passed, message };
    });
    setTestResults(results);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-soft bg-background-light">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors border-b-2 ${
            activeTab === 'rules' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">rule</span>
          Rules ({config.rules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('error-handler')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors border-b-2 ${
            activeTab === 'error-handler' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">emergency</span>
          Error Handler
        </button>
      </div>

      {/* ============ RULES TAB ============ */}
      {activeTab === 'rules' && (
        <>
          {/* Compact toolbar: filters left, add-rule right */}
          <div className="flex items-center gap-2 border-b border-border-soft px-4 py-2">
            <div className="flex items-center gap-1">
              {(['all', 'Error', 'Warning'] as const).map((f) => {
                const label = f === 'all' ? 'All' : f === 'Error' ? 'Errors' : 'Warnings';
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      filter === f ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-1 rounded-md border border-border-soft px-2.5 py-1 text-[11px] font-semibold text-text-main transition-colors hover:border-primary/30 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>Add Rule
            </button>
          </div>

          {/* Rule list with inline expand */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2 space-y-1.5">
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
              const isExpanded = rule.id === selectedRuleId;
              const sev = SEVERITY_STYLE[rule.severity];
              const isAuto = rule.source === 'auto';
              return (
                <div key={rule.id} className={`rounded-lg border transition-all ${
                  isExpanded ? 'border-primary/40 bg-primary/[0.02] ring-1 ring-primary/10' : 'border-border-soft bg-surface hover:border-primary/20'
                }`}>
                  {/* Rule header row */}
                  <button type="button" onClick={() => onSelectRule(isExpanded ? null : rule.id)} className="flex w-full items-center gap-2.5 p-2.5 text-left">
                    {/* Toggle */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                      className={`flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-slate-200'}`}
                      aria-label={rule.enabled ? 'Disable' : 'Enable'}
                    >
                      <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-[15px]' : 'translate-x-[2px]'}`} />
                    </button>

                    {/* Name + expression */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-[11px] font-semibold truncate ${rule.enabled ? 'text-text-main' : 'text-text-muted'}`}>
                          {rule.name || 'Unnamed rule'}
                        </p>
                        {isAuto && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-ai-bg px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-ai">
                            <span className="material-symbols-outlined text-[9px]">auto_fix_high</span>auto
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                        {rule.field} {operatorLabel(rule.operator)}{operatorNeedsValue(rule.operator) ? ` ${Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}` : ''}
                      </p>
                    </div>

                    {/* Severity badge — fixed width */}
                    <span className={`shrink-0 inline-flex w-[68px] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${sev.bg} ${sev.text}`}>
                      <span className="material-symbols-outlined text-[11px]">{sev.icon}</span>{rule.severity}
                    </span>

                    {/* Action icons — always occupy space */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); duplicateRule(rule); }}
                      className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-slate-100 hover:text-primary transition-colors ${isAuto ? 'invisible' : ''}`}
                      aria-label="Duplicate rule"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    </button>

                    <button type="button" onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                      className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-slate-100 hover:text-danger transition-colors ${isAuto ? 'invisible' : ''}`}
                      aria-label="Remove rule"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>

                    {/* Expand chevron */}
                    <span className={`material-symbols-outlined text-[14px] text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {/* Inline detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border-soft px-3 py-3 space-y-2.5 bg-slate-50/50">
                      <TextField label="Rule Name" value={rule.name} onChange={(v) => updateRule(rule.id, { name: v })} placeholder="e.g. Invoice number required" />

                      {/* Field selector */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/80 mb-0.5">Field</label>
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                          disabled={isAuto}
                          className="w-full rounded border border-border-soft bg-surface px-2 py-1.5 text-[11px] font-mono text-text-main focus:border-primary/50 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="">Select field...</option>
                          {targetFields.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                          {rule.field && !targetFields.includes(rule.field) && (
                            <option value={rule.field}>{rule.field}</option>
                          )}
                        </select>
                      </div>

                      {/* Operator selector */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/80 mb-0.5">Operator</label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(rule.id, { operator: e.target.value as ValidationOperator })}
                          disabled={isAuto}
                          className="w-full rounded border border-border-soft bg-surface px-2 py-1.5 text-[11px] text-text-main focus:border-primary/50 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {VALIDATION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Value input (conditional) */}
                      {operatorNeedsValue(rule.operator) && (
                        <TextField
                          label={rule.operator === 'IN' || rule.operator === 'NOT_IN' ? 'Values (comma-separated)' : 'Value'}
                          value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
                          onChange={(v) => {
                            if (rule.operator === 'IN' || rule.operator === 'NOT_IN') {
                              updateRule(rule.id, { value: v.split(',').map((s) => s.trim()) });
                            } else {
                              updateRule(rule.id, { value: v });
                            }
                          }}
                          placeholder={rule.operator === 'MATCHES' ? 'e.g. ^INV-\\d+$' : 'e.g. 0'}
                        />
                      )}

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <SelectField label="Severity" value={rule.severity} options={SEVERITIES} onChange={(v) => updateRule(rule.id, { severity: v })} />
                        </div>
                        <div className="pt-4">
                          <CheckboxField label="Rule enabled" checked={rule.enabled} onChange={(v) => updateRule(rule.id, { enabled: v })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Test panel */}
          {config.rules.length > 0 && (
            <div className="flex-none border-t border-border-soft px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80">Test Rules Against Sample</p>
                <button type="button" onClick={runTest} className="inline-flex items-center gap-1 rounded text-[10px] font-semibold text-primary hover:text-primary/80">
                  <span className="material-symbols-outlined text-[12px]">play_arrow</span>Run Test
                </button>
              </div>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                placeholder='{"invoice-number": "INV-001", "gross-total": 150}'
                rows={2}
                className="w-full rounded border border-border-soft bg-surface px-2 py-1.5 text-[11px] font-mono text-text-main placeholder:text-text-muted/40 focus:border-primary/50 focus:outline-none"
              />
              {testResults && (
                <div className="mt-1.5 space-y-0.5">
                  {testResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-[10px] ${r.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span className="material-symbols-outlined text-[11px]">{r.passed ? 'check_circle' : 'cancel'}</span>
                      <span className="font-medium">{r.ruleName}:</span>
                      <span>{r.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ ERROR HANDLER TAB ============ */}
      {activeTab === 'error-handler' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          <div className="max-w-lg space-y-5">
            <div>
              <h3 className="text-[13px] font-bold text-text-main mb-0.5">Error Handler</h3>
              <p className="text-[11px] text-text-muted">Configure how failed records are routed when validation rules reject them.</p>
            </div>

            {/* Logging */}
            <div className="rounded-lg border border-border-soft p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-500">description</span>
                <p className="text-[12px] font-semibold text-text-main">Logging</p>
              </div>
              <CheckboxField label="Log failed records to integration run history" checked={config.errorConfig.logEnabled} onChange={(v) => updateErrorConfig({ logEnabled: v })} />
              <CheckboxField label="Include full record data in log entries" checked={config.errorConfig.includeRecordData} onChange={(v) => updateErrorConfig({ includeRecordData: v })} />
            </div>

            {/* DLQ */}
            <div className="rounded-lg border border-border-soft p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-500">inbox</span>
                <p className="text-[12px] font-semibold text-text-main">Dead Letter Queue (Validation)</p>
              </div>
              <p className="text-[10px] text-text-muted">Route rejected records to a DLQ for inspection and replay.</p>
              <CheckboxField label="Enable validation DLQ" checked={config.errorConfig.dlqEnabled} onChange={(v) => updateErrorConfig({ dlqEnabled: v })} />
              {config.errorConfig.dlqEnabled && (
                <TextField label="DLQ Topic" value={config.errorConfig.dlqTopic} onChange={(v) => updateErrorConfig({ dlqTopic: v })} placeholder="e.g. integration.validation.dlq" />
              )}
            </div>

            {/* Notifications */}
            <div className="rounded-lg border border-border-soft p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-500">notifications</span>
                <p className="text-[12px] font-semibold text-text-main">Notifications</p>
              </div>
              <SelectField label="Channel" value={config.errorConfig.notifyChannel} options={NOTIFY_CHANNELS} onChange={(v) => updateErrorConfig({ notifyChannel: v })} />
              {config.errorConfig.notifyChannel !== 'None' && (
                <TextField
                  label={config.errorConfig.notifyChannel === 'Email' ? 'Recipients' : config.errorConfig.notifyChannel === 'Slack' ? 'Slack Channel' : 'Teams Webhook'}
                  value={config.errorConfig.notifyRecipients}
                  onChange={(v) => updateErrorConfig({ notifyRecipients: v })}
                  placeholder={config.errorConfig.notifyChannel === 'Email' ? 'team@company.com' : config.errorConfig.notifyChannel === 'Slack' ? '#integration-alerts' : 'https://...'}
                />
              )}
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-slate-50 border border-border-soft p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/80 mb-1">Fail Path Summary</p>
              <div className="space-y-0.5 text-[11px] text-text-muted">
                <p>Records failing validation → <span className="font-medium text-text-main">Reject &amp; Skip</span></p>
                <p>Log: <span className="font-medium text-text-main">{config.errorConfig.logEnabled ? 'Enabled' : 'Disabled'}</span></p>
                <p>DLQ: <span className="font-medium text-text-main">{config.errorConfig.dlqEnabled ? config.errorConfig.dlqTopic || 'Enabled (no topic)' : 'Disabled'}</span></p>
                <p>Notify: <span className="font-medium text-text-main">{config.errorConfig.notifyChannel === 'None' ? 'Disabled' : `${config.errorConfig.notifyChannel} → ${config.errorConfig.notifyRecipients || '(not set)'}`}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
