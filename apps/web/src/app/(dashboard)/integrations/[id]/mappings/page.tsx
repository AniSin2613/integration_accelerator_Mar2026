'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MappingRow } from '@/components/mapping/MappingRow';
import { api } from '@/lib/api-client';

interface MappingRule {
  id: string;
  sourceField: string;
  targetField: string;
  mappingType: string;
  status: string;
  transformConfig: unknown;
  aiConfidence: number | null;
  aiEvidenceSource: string | null;
  aiEvidenceSources?: string[];
  aiExplanation: string | null;
}

interface MappingSet {
  id: string;
  version: number;
  isApproved: boolean;
  rules: MappingRule[];
}

export default function MappingsPage({ params }: { params: { id: string } }) {
  const [sets, setSets] = useState<MappingSet[]>([]);
  const [activeSet, setActiveSet] = useState<MappingSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MappingSet[]>(`/integrations/${params.id}/mappings`).then((data) => {
      setSets(data);
      if (data.length > 0) setActiveSet(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const handleApprove = async (ruleId: string) => {
    if (!activeSet) return;
    await api.post(`/integrations/${params.id}/mappings/rules/${ruleId}/approve`, {}).catch(() => null);
    // Optimistic update
    setActiveSet((prev: MappingSet | null) => prev ? {
      ...prev,
      rules: prev.rules.map((r: MappingRule) => r.id === ruleId ? { ...r, status: 'APPROVED' } : r),
    } : prev);
  };

  const handleReject = async (ruleId: string) => {
    if (!activeSet) return;
    await api.post(`/integrations/${params.id}/mappings/rules/${ruleId}/reject`, {}).catch(() => null);
    setActiveSet((prev: MappingSet | null) => prev ? {
      ...prev,
      rules: prev.rules.map((r: MappingRule) => r.id === ruleId ? { ...r, status: 'REJECTED' } : r),
    } : prev);
  };

  const pendingCount = activeSet?.rules.filter((r: MappingRule) => r.status === 'PENDING_REVIEW').length ?? 0;
  const approvedCount = activeSet?.rules.filter((r: MappingRule) => r.status === 'APPROVED').length ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header row */}
      <div className="flex items-center gap-4">
        <Link href={`/integrations/${params.id}/designer`} className="text-text-muted hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-text-main">Mapping Review</h1>
          <p className="text-sm text-text-muted">
            Zero-trust AI mapping: suggestions require human approval and provenance from approved internal or official platform evidence sources.
          </p>
        </div>
        {activeSet && pendingCount > 0 && (
          <button
            onClick={async () => {
              await api.post(`/integrations/${params.id}/mappings/sets/${activeSet.id}/approve`, {}).catch(() => null);
              setActiveSet((prev: MappingSet | null) => prev ? {
                ...prev,
                isApproved: true,
                rules: prev.rules.map((r: MappingRule) => ({ ...r, status: r.status === 'PENDING_REVIEW' ? 'APPROVED' : r.status })),
              } : prev);
            }}
            className="flex items-center gap-1.5 bg-success text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            Approve All Pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Set selector */}
      {sets.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Mapping Set:</span>
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSet(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                activeSet?.id === s.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border-soft text-text-muted hover:border-primary/40'
              }`}
            >
              v{s.version}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-text-muted text-sm">Loading mappings…</div>
      )}

      {!loading && !activeSet && (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-surface rounded-xl border border-border-soft">
          <span className="material-symbols-outlined text-[48px] text-text-muted/40">transform</span>
          <p className="text-text-muted text-sm">No mapping sets found.</p>
        </div>
      )}

      {activeSet && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">
              Total: <strong className="text-text-main">{activeSet.rules.length}</strong>
            </span>
            <span className="text-success">
              Approved: <strong>{approvedCount}</strong>
            </span>
            <span className="text-warning">
              Pending: <strong>{pendingCount}</strong>
            </span>
            <span className={`ml-auto px-3 py-0.5 rounded-full text-xs font-medium border ${
              activeSet.isApproved ? 'bg-success/10 text-success border-success/30' :
              pendingCount > 0 ? 'bg-warning/10 text-warning border-warning/30' :
              'bg-bg-canvas text-text-muted border-border-soft'
            }`}>
              Set: {activeSet.isApproved ? 'APPROVED' : pendingCount > 0 ? 'PENDING REVIEW' : 'DRAFT'}
            </span>
          </div>

          {/* Column headers */}
          <div className="bg-surface rounded-xl border border-border-soft shadow-soft overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] px-5 py-3 bg-bg-canvas border-b border-border-soft">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Source Field</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-center w-16">Map</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Target Field</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Actions</span>
            </div>
            {activeSet.rules.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No mapping rules in this set.</div>
            ) : (
              activeSet.rules.map((rule, i) => (
                <MappingRow
                  key={rule.id}
                  rule={rule}
                  index={i}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
