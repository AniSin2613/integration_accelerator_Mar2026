'use client';

import { Badge } from '@/components/ui/Badge';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DriftSuggestionRecord {
  id: string;
  targetProfileId: string;
  fieldPath: string;
  suggestionType: string;
  details: Record<string, unknown>;
  isApplied: boolean;
  status: string;
  observedIssueType: string | null;
  suggestedChange: string | null;
  confidence: string | number | null;
  environment: string | null;
  requestRef: string | null;
  responseRef: string | null;
  rawErrorExcerpt: string | null;
  sourceRunRef: string | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  overlayId: string | null;
  versionId: string | null;
  createdAt: string;
  targetProfile?: {
    id: string;
    name: string;
    system: string;
    object: string;
    isPublished: boolean;
  };
}

// ── Status Badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'draft'; label: string }> = {
  NEW: { variant: 'warning', label: 'New' },
  IN_REVIEW: { variant: 'info', label: 'In Review' },
  APPROVED: { variant: 'success', label: 'Approved' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CONVERTED_CONDITIONAL: { variant: 'neutral', label: 'Conditional' },
};

export function DriftSuggestionStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { variant: 'neutral' as const, label: status };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

// ── Confidence Badge ───────────────────────────────────────────────────────

export function DriftConfidenceBadge({ confidence }: { confidence: string | number | null }) {
  if (confidence == null) return null;
  const val = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
  const pct = Math.round(val * 100);
  const variant = pct >= 80 ? 'text-emerald-700 bg-emerald-50' : pct >= 50 ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-100';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${variant}`}>
      {pct}%
    </span>
  );
}

// ── Issue Type Label ───────────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  MISSING_REQUIRED_FIELD: { icon: 'warning', label: 'Missing Required', color: 'text-red-700' },
  UNKNOWN_FIELD: { icon: 'help_outline', label: 'Unknown Field', color: 'text-amber-700' },
  INVALID_TYPE_OR_FORMAT: { icon: 'swap_horiz', label: 'Type/Format', color: 'text-purple-700' },
  FORBIDDEN_VALUE: { icon: 'block', label: 'Forbidden Value', color: 'text-red-600' },
  BUSINESS_RULE_REJECTION: { icon: 'rule', label: 'Business Rule', color: 'text-amber-600' },
  AUTH_OR_PERMISSION_ISSUE: { icon: 'lock', label: 'Auth/Permission', color: 'text-slate-600' },
  TARGET_CONTRACT_MISMATCH: { icon: 'sync_problem', label: 'Contract Mismatch', color: 'text-rose-700' },
  UNKNOWN_TARGET_ERROR: { icon: 'error_outline', label: 'Unknown Error', color: 'text-slate-500' },
};

export function IssueTypeLabel({ type }: { type: string | null }) {
  if (!type) return <span className="text-[11px] text-text-muted">—</span>;
  const config = ISSUE_TYPE_LABELS[type] ?? { icon: 'error_outline', label: type, color: 'text-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${config.color}`}>
      <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ── Suggested Change Label ─────────────────────────────────────────────────

const CHANGE_LABELS: Record<string, string> = {
  MARK_CUSTOMER_REQUIRED: 'Mark as customer-required',
  MARK_CONDITIONAL: 'Mark as conditional',
  REVIEW_UNKNOWN_FIELD: 'Review unknown field',
  REVIEW_FIELD_TYPE: 'Review field type',
  REVIEW_FIELD_VISIBILITY: 'Review field visibility',
};

export function SuggestedChangeLabel({ change }: { change: string | null }) {
  if (!change) return <span className="text-[11px] text-text-muted">—</span>;
  return <span className="text-[11px] font-medium text-text-main">{CHANGE_LABELS[change] ?? change}</span>;
}

// ── Suggestion Type Badge ──────────────────────────────────────────────────

const SUGGESTION_TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  NEW_FIELD: { icon: 'add_circle', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  DEPRECATED_FIELD: { icon: 'remove_circle', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  TYPE_CHANGE: { icon: 'swap_horiz', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  CONSTRAINT_CHANGE: { icon: 'rule', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
};

export function SuggestionTypeBadge({ type }: { type: string }) {
  const cfg = SUGGESTION_TYPE_CONFIG[type] ?? SUGGESTION_TYPE_CONFIG.CONSTRAINT_CHANGE;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

// ── Evidence Preview ───────────────────────────────────────────────────────

export function DriftEvidencePreview({ suggestion }: { suggestion: DriftSuggestionRecord }) {
  return (
    <div className="space-y-2">
      {suggestion.rawErrorExcerpt && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Error Excerpt</p>
          <pre className="rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[11px] text-text-main font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">
            {suggestion.rawErrorExcerpt}
          </pre>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-text-muted">
        {suggestion.requestRef && (
          <span><span className="font-semibold">Request:</span> {suggestion.requestRef}</span>
        )}
        {suggestion.responseRef && (
          <span><span className="font-semibold">Response:</span> {suggestion.responseRef}</span>
        )}
        {suggestion.sourceRunRef && (
          <span><span className="font-semibold">Run:</span> {suggestion.sourceRunRef}</span>
        )}
        {suggestion.environment && (
          <span><span className="font-semibold">Env:</span> {suggestion.environment}</span>
        )}
      </div>
    </div>
  );
}

// ── Action Bar ─────────────────────────────────────────────────────────────

interface DriftActionBarProps {
  suggestion: DriftSuggestionRecord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvertConditional: (id: string) => void;
  loading?: boolean;
}

export function DriftActionBar({ suggestion, onApprove, onReject, onConvertConditional, loading }: DriftActionBarProps) {
  const isActionable = suggestion.status === 'NEW' || suggestion.status === 'IN_REVIEW';
  if (!isActionable) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onApprove(suggestion.id)}
        disabled={loading}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Approve
      </button>
      <button
        type="button"
        onClick={() => onReject(suggestion.id)}
        disabled={loading}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[14px]">cancel</span>
        Reject
      </button>
      <button
        type="button"
        onClick={() => onConvertConditional(suggestion.id)}
        disabled={loading}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[14px]">alt_route</span>
        Conditional
      </button>
    </div>
  );
}

// ── Suggestion Table Row ───────────────────────────────────────────────────

interface DriftSuggestionTableRowProps {
  suggestion: DriftSuggestionRecord;
  onClick?: (suggestion: DriftSuggestionRecord) => void;
}

export function DriftSuggestionTableRow({ suggestion, onClick }: DriftSuggestionTableRowProps) {
  return (
    <tr
      className={`border-b border-border-soft last:border-0 ${onClick ? 'cursor-pointer hover:bg-background-light transition-colors' : ''}`}
      onClick={() => onClick?.(suggestion)}
    >
      <td className="px-3 py-2.5">
        <span className="text-xs font-mono font-semibold text-text-main">{suggestion.fieldPath}</span>
      </td>
      <td className="px-3 py-2.5">
        <SuggestionTypeBadge type={suggestion.suggestionType} />
      </td>
      <td className="px-3 py-2.5">
        <IssueTypeLabel type={suggestion.observedIssueType} />
      </td>
      <td className="px-3 py-2.5">
        <SuggestedChangeLabel change={suggestion.suggestedChange} />
      </td>
      <td className="px-3 py-2.5">
        <DriftConfidenceBadge confidence={suggestion.confidence} />
      </td>
      <td className="px-3 py-2.5">
        <DriftSuggestionStatusBadge status={suggestion.status} />
      </td>
      <td className="px-3 py-2.5 text-[11px] text-text-muted">
        {suggestion.targetProfile ? `${suggestion.targetProfile.system}/${suggestion.targetProfile.object}` : '—'}
      </td>
      <td className="px-3 py-2.5 text-[10px] text-text-muted">
        {new Date(suggestion.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

// ── Suggestion Table ───────────────────────────────────────────────────────

interface DriftSuggestionTableProps {
  suggestions: DriftSuggestionRecord[];
  onRowClick?: (suggestion: DriftSuggestionRecord) => void;
  emptyMessage?: string;
}

export function DriftSuggestionTable({ suggestions, onRowClick, emptyMessage }: DriftSuggestionTableProps) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface p-8 text-center">
        <span className="material-symbols-outlined text-[28px] text-text-muted/40">inbox</span>
        <p className="mt-2 text-sm text-text-muted">{emptyMessage ?? 'No drift suggestions'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-soft bg-surface shadow-soft">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-soft bg-background-light">
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Field</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Type</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Issue</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Suggested</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Conf.</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Status</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Target</th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Date</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((s) => (
            <DriftSuggestionTableRow key={s.id} suggestion={s} onClick={onRowClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
