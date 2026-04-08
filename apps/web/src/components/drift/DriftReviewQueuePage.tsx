'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api-client';
import {
  DriftSuggestionTable,
  DriftSuggestionStatusBadge,
  DriftConfidenceBadge,
  DriftEvidencePreview,
  DriftActionBar,
  IssueTypeLabel,
  SuggestedChangeLabel,
  SuggestionTypeBadge,
  type DriftSuggestionRecord,
} from '@/components/drift/DriftComponents';

const STATUS_TABS = ['All', 'NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED_CONDITIONAL'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_LABELS: Record<string, string> = {
  All: 'All',
  NEW: 'New',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONVERTED_CONDITIONAL: 'Conditional',
};

// ── Effective field state from enriched detail ─────────────────────────────

interface EffectiveFieldState {
  path: string;
  dataType: string;
  required: boolean;
  businessName: string | null;
  validationRule: string | null;
  defaultValue: string | null;
  source: string;
}

interface SuggestionDetail extends DriftSuggestionRecord {
  effectiveFieldState: EffectiveFieldState | null;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DriftReviewQueuePage() {
  const [suggestions, setSuggestions] = useState<DriftSuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterObject, setFilterObject] = useState('');
  const [selected, setSelected] = useState<SuggestionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'All') params.set('status', activeTab);
      if (filterSystem) params.set('system', filterSystem);
      if (filterObject) params.set('object', filterObject);
      const qs = params.toString();
      const data = await api.get<DriftSuggestionRecord[]>(`/drift-review${qs ? `?${qs}` : ''}`);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load drift suggestions', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterSystem, filterObject]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: suggestions.length };
    for (const s of suggestions) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [suggestions]);

  // ── Filter unique systems/objects for filter dropdowns ───────────────────

  const uniqueSystems = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) {
      if (s.targetProfile?.system) set.add(s.targetProfile.system);
    }
    return Array.from(set).sort();
  }, [suggestions]);

  const uniqueObjects = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) {
      if (s.targetProfile?.object) set.add(s.targetProfile.object);
    }
    return Array.from(set).sort();
  }, [suggestions]);

  // ── Detail View ──────────────────────────────────────────────────────────

  const handleRowClick = async (suggestion: DriftSuggestionRecord) => {
    setDetailLoading(true);
    setNoteText('');
    try {
      const detail = await api.get<SuggestionDetail>(`/drift-review/${suggestion.id}`);
      setSelected(detail);
    } catch (err) {
      console.error('Failed to load suggestion detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAction = async (action: 'approve' | 'reject' | 'convert-conditional', id: string) => {
    setActionLoading(true);
    try {
      await api.post(`/drift-review/${id}/${action}`, {
        reviewerId: 'platform-admin',
        note: noteText || undefined,
      });
      setSelected(null);
      loadSuggestions();
    } catch (err) {
      console.error(`Failed to ${action} suggestion`, err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filtered list (tab already filters via API, but also filter by All) ─

  const filteredSuggestions = useMemo(() => {
    if (activeTab === 'All') return suggestions;
    return suggestions.filter((s) => s.status === activeTab);
  }, [suggestions, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-xl border border-rose-200/70 bg-rose-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-rose-700">sync_problem</span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-900">Admin Review</p>
        </div>
        <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-text-main">Drift Review Queue</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Review runtime-detected drift suggestions. Approve to update overlays, reject to dismiss, or convert to conditional.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-border-soft bg-surface p-1.5 shadow-soft">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab] ?? 0;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-background-light hover:text-text-main'
              }`}
            >
              {TAB_LABELS[tab]}
              {count > 0 && (
                <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold ${
                  isActive ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-text-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {uniqueSystems.length > 0 && (
          <select
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            className="h-9 rounded-lg border border-border-soft bg-background-light px-3 text-xs text-text-main focus:border-primary/40 focus:outline-none"
            aria-label="Filter by system"
          >
            <option value="">All Systems</option>
            {uniqueSystems.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {uniqueObjects.length > 0 && (
          <select
            value={filterObject}
            onChange={(e) => setFilterObject(e.target.value)}
            className="h-9 rounded-lg border border-border-soft bg-background-light px-3 text-xs text-text-main focus:border-primary/40 focus:outline-none"
            aria-label="Filter by interface"
          >
            <option value="">All Interfaces</option>
            {uniqueObjects.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <div className="ml-auto text-[11px] text-text-muted">
          {loading ? 'Loading…' : `${filteredSuggestions.length} suggestion(s)`}
        </div>
      </div>

      {/* Table + Detail Split */}
      <div className="flex gap-6">
        <div className={`${selected ? 'w-3/5' : 'w-full'} transition-all`}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-text-muted">
              <span className="material-symbols-outlined animate-spin text-[20px] mr-2">progress_activity</span>
              Loading suggestions…
            </div>
          ) : (
            <DriftSuggestionTable
              suggestions={filteredSuggestions}
              onRowClick={handleRowClick}
              emptyMessage={activeTab === 'All' ? 'No drift suggestions found. Run a test with a simulated target response to generate drift analysis.' : `No ${TAB_LABELS[activeTab].toLowerCase()} suggestions.`}
            />
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-2/5 space-y-4 rounded-xl border border-border-soft bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-main">Suggestion Detail</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-background-light transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-text-muted">close</span>
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-8 text-text-muted">
                <span className="material-symbols-outlined animate-spin text-[16px] mr-2">progress_activity</span>
                Loading…
              </div>
            ) : (
              <div className="space-y-4">
                {/* Target Info */}
                {selected.targetProfile && (
                  <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Target</p>
                    <p className="text-xs font-semibold text-text-main">{selected.targetProfile.name}</p>
                    <p className="text-[11px] text-text-muted">{selected.targetProfile.system} / {selected.targetProfile.object}</p>
                  </div>
                )}

                {/* Field & Classification */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Field</p>
                    <p className="text-xs font-mono font-semibold text-text-main">{selected.fieldPath}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Status</p>
                    <DriftSuggestionStatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Issue Type</p>
                    <IssueTypeLabel type={selected.observedIssueType} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Confidence</p>
                    <DriftConfidenceBadge confidence={selected.confidence} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Suggestion Type</p>
                    <SuggestionTypeBadge type={selected.suggestionType} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Suggested Change</p>
                    <SuggestedChangeLabel change={selected.suggestedChange} />
                  </div>
                </div>

                {/* Effective Field State */}
                {selected.effectiveFieldState && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Current Effective Schema</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className="text-text-muted">Data Type:</span>
                      <span className="font-mono text-text-main">{selected.effectiveFieldState.dataType}</span>
                      <span className="text-text-muted">Required:</span>
                      <span className="text-text-main">{selected.effectiveFieldState.required ? 'Yes' : 'No'}</span>
                      <span className="text-text-muted">Source:</span>
                      <span className="text-text-main">{selected.effectiveFieldState.source}</span>
                      {selected.effectiveFieldState.businessName && (
                        <>
                          <span className="text-text-muted">Business Name:</span>
                          <span className="text-text-main">{selected.effectiveFieldState.businessName}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                <DriftEvidencePreview suggestion={selected} />

                {/* Reviewer Info */}
                {selected.reviewedBy && (
                  <div className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">Review</p>
                    <p className="text-[11px] text-text-main">Reviewed by: {selected.reviewedBy}</p>
                    {selected.reviewedAt && (
                      <p className="text-[10px] text-text-muted">{new Date(selected.reviewedAt).toLocaleString()}</p>
                    )}
                    {selected.reviewerNote && (
                      <p className="mt-1 text-[11px] text-text-main italic">&ldquo;{selected.reviewerNote}&rdquo;</p>
                    )}
                  </div>
                )}

                {/* Admin Note + Actions */}
                {(selected.status === 'NEW' || selected.status === 'IN_REVIEW') && (
                  <div className="space-y-3 border-t border-border-soft pt-3">
                    <div>
                      <label htmlFor="drift-note" className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Add Note</label>
                      <textarea
                        id="drift-note"
                        rows={2}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Optional reviewer note…"
                        className="mt-1 w-full rounded-lg border border-border-soft bg-background-light px-3 py-2 text-xs text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none"
                      />
                    </div>
                    <DriftActionBar
                      suggestion={selected}
                      onApprove={(id) => handleAction('approve', id)}
                      onReject={(id) => handleAction('reject', id)}
                      onConvertConditional={(id) => handleAction('convert-conditional', id)}
                      loading={actionLoading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
