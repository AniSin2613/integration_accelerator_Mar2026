'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchemaField {
  path: string;
  label: string;
  required?: boolean;
}

interface AskFieldCandidate {
  rank: number;
  sourceFields: string[];
  confidence: number;
  rationale: string;
  transformHint: string | null;
  mappingType: string;
}

type MsgFrom = 'copilot' | 'user';
type MsgType = 'text' | 'candidates';

interface CopilotMsg {
  id: string;
  from: MsgFrom;
  type: MsgType;
  text: string;
  candidates?: AskFieldCandidate[];
  pendingTarget?: string;
}

type CopilotPhase =
  | 'greeting'      // welcome shown, field picker in footer
  | 'thinking'      // API call in flight
  | 'results'       // candidates shown (including 0-result state)
  | 'needs-context' // no candidates, asking for more context via text
  | 'confirming';   // apply confirmed, maybe offering transform

export interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
  integrationId: string;
  sourceSchema: SchemaField[];
  targetSchema: SchemaField[];
  existingMappings: Array<{ targetField: string }>;
  onApplyMapping: (sourceField: string, targetField: string, withTransform?: string | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let msgSeq = 0;
const mkId = () => `cm-${++msgSeq}-${Date.now()}`;

const WELCOME: CopilotMsg = {
  id: 'welcome',
  from: 'copilot',
  type: 'text',
  text:
    "Hi! I'm Integration Copilot 👋\n\nI'm here to help you find the right source fields and suggest transformations for your mapping canvas.\n\nSelect a target field below and I'll analyse your schema to find the best match. If I'm not confident, I'll ask for more context.",
};

const confidencePill = (c: number) => {
  const pct = Math.round(c * 100);
  const icon = <span className="material-symbols-outlined text-[11px]">auto_awesome</span>;
  if (pct >= 80) return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ai/15 text-ai">{icon}{pct}%</span>;
  if (pct >= 60) return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ai/10 text-ai-text">{icon}{pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ai-bg text-ai-text/70">{icon}{pct}%</span>;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CopilotPanel({
  open,
  onClose,
  integrationId,
  sourceSchema,
  targetSchema,
  existingMappings,
  onApplyMapping,
}: CopilotPanelProps) {
  const [msgs, setMsgs] = useState<CopilotMsg[]>([WELCOME]);
  const [phase, setPhase] = useState<CopilotPhase>('greeting');
  const [selectedField, setSelectedField] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [lastTarget, setLastTarget] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset chat on open
  useEffect(() => {
    if (open) {
      setMsgs([WELCOME]);
      setPhase('greeting');
      setSelectedField('');
      setContextInput('');
      setLastTarget('');
    }
  }, [open]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const addMsg = (msg: Omit<CopilotMsg, 'id'>) =>
    setMsgs((prev) => [...prev, { ...msg, id: mkId() }]);

  const removeThinking = () =>
    setMsgs((prev) => prev.filter((m) => m.id !== 'thinking'));

  const unmappedFields = targetSchema.filter(
    (f) => !existingMappings.find((m) => m.targetField === f.path),
  );

  // ── Ask a field ─────────────────────────────────────────────────────────────
  const handleAsk = async (field: string, ctx?: string) => {
    const label = targetSchema.find((f) => f.path === field)?.label || field;
    const userText = ctx
      ? `Context for "${label}": ${ctx}`
      : `What source fields should map to "${label}"?`;

    addMsg({ from: 'user', type: 'text', text: userText });
    setMsgs((prev) => [
      ...prev,
      { id: 'thinking', from: 'copilot', type: 'text', text: 'Analysing your schema…' },
    ]);
    setPhase('thinking');
    setLastTarget(field);
    setContextInput('');

    try {
      const result = await api.post<{
        candidates: AskFieldCandidate[];
        contextRequired: boolean;
      }>(`/integrations/${integrationId}/copilot/ask-field`, {
        targetField: field,
        sourceFields: sourceSchema.map((f) => f.path),
        confidenceThreshold: 0.45,
        maxCandidates: 3,
        context: ctx,
      });

      removeThinking();

      if (result.candidates.length > 0) {
        addMsg({
          from: 'copilot',
          type: 'candidates',
          text:
            result.candidates.length === 1
              ? `I found one suggestion for **${label}**:`
              : `I found ${result.candidates.length} suggestions for **${label}**. The top match is highlighted:`,
          candidates: result.candidates,
          pendingTarget: field,
        });
        setPhase('results');
      } else if (result.contextRequired) {
        addMsg({
          from: 'copilot',
          type: 'text',
          text: `I couldn't find a confident match for **${label}** in your source schema.\n\nCould you give me more context? For example:\n• What business data does this field hold?\n• Are there known source fields it relates to?\n• What format or unit is expected?`,
        });
        setPhase('needs-context');
      } else {
        addMsg({
          from: 'copilot',
          type: 'text',
          text: `I searched every source field but couldn't find a match for **${label}** — even with relaxed thresholds. This field may need a manual mapping or a multi-field expression.\n\nWould you like to try another field?`,
        });
        setPhase('greeting');
      }
    } catch (err) {
      removeThinking();
      addMsg({
        from: 'copilot',
        type: 'text',
        text: `Something went wrong while searching. ${err instanceof Error ? err.message : 'Please try again.'}`,
      });
      setPhase('greeting');
    }
  };

  // ── Apply a candidate ────────────────────────────────────────────────────────
  const handleApply = (candidate: AskFieldCandidate, targetField: string, withTransform: boolean) => {
    const tLabel = targetSchema.find((f) => f.path === targetField)?.label || targetField;
    const sLabel = candidate.sourceFields[0];
    const transform = withTransform ? candidate.transformHint : null;

    addMsg({ from: 'user', type: 'text', text: `Apply: ${sLabel} → ${tLabel}${withTransform && candidate.transformHint ? ' (with transform)' : ''}` });

    onApplyMapping(candidate.sourceFields[0], targetField, transform);

    const appliedText = withTransform && candidate.transformHint
      ? `Done! I've added the mapping **${sLabel} → ${tLabel}** with the transformation hint to your canvas, marked for review. ✓\n\n_You can refine the transformation in the Transform Editor (pencil icon on the row)._`
      : `Done! I've added the mapping **${sLabel} → ${tLabel}** to your canvas, marked for review. ✓`;

    addMsg({ from: 'copilot', type: 'text', text: appliedText });
    addMsg({ from: 'copilot', type: 'text', text: 'Would you like me to look up another field?' });
    setPhase('greeting');
    setSelectedField('');
  };

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-end sm:items-start sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Integration Copilot"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0F172A]/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="relative z-10 flex w-full flex-col bg-surface shadow-xl sm:h-full sm:max-w-[460px] sm:rounded-l-2xl rounded-t-2xl sm:rounded-t-none"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ai-bg">
              <span className="material-symbols-outlined text-[18px] text-ai">smart_toy</span>
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-text-main leading-none">Integration Copilot</h2>
              <p className="text-[10px] text-text-muted mt-0.5">Field mapping assistant</p>
            </div>
            <span className="ml-1 rounded-full bg-ai-bg px-2 py-0.5 text-[10px] font-semibold text-ai-text">Beta</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {msgs.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.from === 'copilot' && (
                <div className="mr-2 mt-0.5 h-6 w-6 shrink-0 rounded-full bg-ai-bg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px] text-ai">smart_toy</span>
                </div>
              )}
              <div className={`max-w-[85%] ${msg.from === 'user' ? 'order-first' : ''}`}>
                {msg.type === 'text' && (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap ${
                      msg.from === 'copilot'
                        ? msg.id === 'thinking'
                          ? 'bg-slate-100 text-text-muted italic animate-pulse'
                          : 'bg-slate-100 text-text-main'
                        : 'bg-ai text-white'
                    } ${msg.from === 'copilot' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                  >
                    {/* Render **bold** snippets */}
                    {msg.text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
                    )}
                  </div>
                )}

                {msg.type === 'candidates' && (
                  <div className="space-y-2">
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[12px] text-text-main leading-relaxed">
                      {msg.text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
                      )}
                    </div>
                    {(msg.candidates ?? []).map((c) => (
                      <div
                        key={c.rank}
                        className={`rounded-xl border bg-surface p-3 shadow-sm space-y-1.5 ${
                          c.rank === 1 ? 'border-ai/20 bg-ai-bg/50' : 'border-border-soft'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {c.rank === 1 && (
                              <span className="material-symbols-outlined text-[14px] text-ai shrink-0">star</span>
                            )}
                            <p className="text-[12px] font-semibold text-text-main truncate">
                              {c.sourceFields.join(' + ')}
                            </p>
                          </div>
                          {confidencePill(c.confidence)}
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">{c.rationale}</p>
                        {c.transformHint && (
                          <div className="rounded-lg bg-primary/5 border border-primary/10 px-2.5 py-1.5">
                            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">Transform hint</p>
                            <p className="text-[11px] text-primary/90 italic">{c.transformHint}</p>
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleApply(c, msg.pendingTarget ?? lastTarget, false)}
                            className="inline-flex items-center gap-1 rounded-lg bg-ai px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-ai-text transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">add</span>
                            Apply mapping
                          </button>
                          {c.transformHint && (
                            <button
                              type="button"
                              onClick={() => handleApply(c, msg.pendingTarget ?? lastTarget, true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[13px]">transform</span>
                              Apply with transform
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Footer — contextual controls */}
        <div className="shrink-0 border-t border-border-soft px-4 py-3 space-y-2 bg-surface">
          {(phase === 'greeting' || phase === 'results') && (
            <>
              <p className="text-[11px] text-text-muted">
                {phase === 'results' ? 'Ask about another field:' : 'Select a target field to get started:'}
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[12px] text-text-main focus:border-ai/40 focus:outline-none focus:ring-1 focus:ring-ai/20"
                >
                  <option value="">— Select target field —</option>
                  {unmappedFields.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.label || f.path}{f.required ? ' *' : ''}
                    </option>
                  ))}
                  {/* Show already-mapped fields at the bottom so user can re-query */}
                  {targetSchema
                    .filter((f) => existingMappings.find((m) => m.targetField === f.path))
                    .map((f) => (
                      <option key={f.path} value={f.path} style={{ color: '#94a3b8' }}>
                        {f.label || f.path} (mapped)
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedField}
                  onClick={() => handleAsk(selectedField)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-ai px-4 py-2 text-[12px] font-semibold text-white hover:bg-ai-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span>
                  Ask
                </button>
              </div>
            </>
          )}

          {phase === 'needs-context' && (
            <>
              <p className="text-[11px] text-text-muted">Provide more context to refine the search:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && contextInput.trim()) handleAsk(lastTarget, contextInput.trim());
                  }}
                  placeholder="e.g. 'customer's full legal name as registered'"
                  className="min-w-0 flex-1 rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[12px] text-text-main focus:border-ai/40 focus:outline-none focus:ring-1 focus:ring-ai/20"
                />
                <button
                  type="button"
                  disabled={!contextInput.trim()}
                  onClick={() => handleAsk(lastTarget, contextInput.trim())}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-ai px-3 py-2 text-[12px] font-semibold text-white hover:bg-ai-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                </button>
              </div>
            </>
          )}

          {phase === 'thinking' && (
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
              <span className="material-symbols-outlined text-[14px] text-ai animate-spin">progress_activity</span>
              Searching schema…
            </div>
          )}

          {phase === 'confirming' && (
            <p className="text-[11px] text-text-muted">Mapping applied. Select another field above to continue.</p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="shrink-0 border-t border-border-soft px-4 py-2 bg-slate-50">
          <p className="text-[10px] text-text-muted/70">
            Copilot suggestions are based on field name similarity and are marked for review before promote.
          </p>
        </div>
      </aside>
    </div>
  );
}
