'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface ReleaseArtifact {
  id: string;
  version: string;
  status: string;
  camelYaml: string | null;
  createdAt: string;
  approvals: { id: string; status: string; approver?: { email: string } }[];
  environmentReleases: { id: string; environment: { name: string; type: string }; deployedAt: string }[];
}

const statusStyle: Record<string, { variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'draft'; label: string }> = {
  DRAFT:              { variant: 'draft',    label: 'Draft' },
  SUBMITTED:          { variant: 'warning',  label: 'Submitted' },
  APPROVED:           { variant: 'success',  label: 'Approved' },
  DEPLOYED:           { variant: 'info',     label: 'Deployed' },
  SUPERSEDED:         { variant: 'neutral',  label: 'Superseded' },
  REJECTED:           { variant: 'danger',   label: 'Rejected' },
};

const envOrder = { DEV: 0, TEST: 1, PROD: 2 };

export default function ReleasesPage({ params }: { params: { id: string } }) {
  const [releases, setReleases] = useState<ReleaseArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewYaml, setPreviewYaml] = useState<string | null>(null);
  const [rollbackTargetId, setRollbackTargetId] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    api.get<ReleaseArtifact[]>(`/integrations/${params.id}/releases`).then((data) => {
      setReleases(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (artifactId: string) => {
    await api.post(`/integrations/${params.id}/releases/${artifactId}/submit`, {}).catch(() => null);
    setReleases((prev) => prev.map((r) => r.id === artifactId ? { ...r, status: 'SUBMITTED' } : r));
  };

  const handleApprove = async (artifactId: string) => {
    await api.post(`/integrations/${params.id}/releases/${artifactId}/approve`, {}).catch(() => null);
    setReleases((prev) => prev.map((r) => r.id === artifactId ? { ...r, status: 'APPROVED' } : r));
  };

  const handlePromote = async (artifactId: string) => {
    await api.post(`/integrations/${params.id}/releases/${artifactId}/promote-next`, {}).catch(() => null);
    // Refetch to show new environment release
    api.get<ReleaseArtifact[]>(`/integrations/${params.id}/releases`).then((data) => {
      setReleases(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }).catch(() => null);
  };

  const handleRollback = async () => {
    if (!rollbackTargetId) return;
    setRollbackLoading(true);
    try {
      await api.post(`/integrations/${params.id}/rollback`, {
        targetArtifactId: rollbackTargetId,
        reason: rollbackReason.trim() || 'Manual rollback',
      });
      const data = await api.get<ReleaseArtifact[]>(`/integrations/${params.id}/releases`);
      setReleases(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // show nothing — a toast system can be wired here later
    } finally {
      setRollbackLoading(false);
      setRollbackTargetId(null);
      setRollbackReason('');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/integrations/${params.id}/mapping`} className="text-text-muted hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-text-main">Releases</h1>
          <p className="text-sm text-text-muted">DEV → TEST → PROD promotion pipeline.</p>
        </div>
        <button
          onClick={async () => {
            const created = await api.post<ReleaseArtifact>(`/integrations/${params.id}/releases`, {}).catch(() => null);
            if (created) setReleases((prev) => [created, ...prev]);
          }}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Release
        </button>
      </div>

      {loading && <div className="p-12 text-center text-text-muted text-sm">Loading releases…</div>}

      {!loading && releases.length === 0 && (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-surface rounded-xl border border-border-soft">
          <span className="material-symbols-outlined text-[48px] text-text-muted/40">rocket_launch</span>
          <p className="text-text-muted text-sm">No releases yet. Approve mappings first, then create a release artifact.</p>
        </div>
      )}

      <div className="space-y-4">
        {releases.map((rel) => {
          const sb = statusStyle[rel.status] ?? { variant: 'neutral' as const, label: rel.status };
          const envRels = [...(rel.environmentReleases ?? [])].sort(
            (a, b) => (envOrder[a.environment.type as keyof typeof envOrder] ?? 99) - (envOrder[b.environment.type as keyof typeof envOrder] ?? 99)
          );

          return (
            <div key={rel.id} className="bg-surface rounded-xl border border-border-soft shadow-soft p-5">
              <div className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">package_2</span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Version + status */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-text-main">{rel.version}</span>
                    <Badge variant={sb.variant} label={sb.label} />
                    <span className="ml-auto text-xs text-text-muted">
                      {new Date(rel.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Environment pipeline */}
                  <div className="flex items-center gap-2 mb-3">
                    {(['DEV', 'TEST', 'PROD'] as const).map((envType, i) => {
                      const deployed = envRels.find((e) => e.environment.type === envType);
                      return (
                        <div key={envType} className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            deployed
                              ? 'bg-success/10 text-success border-success/30'
                              : 'bg-bg-canvas text-text-muted border-border-soft'
                          }`}>
                            {deployed ? '✓' : '○'} {envType}
                          </div>
                          {i < 2 && <span className="material-symbols-outlined text-[14px] text-text-muted">arrow_forward</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {rel.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmit(rel.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-warning/40 bg-warning/10 text-warning font-medium hover:bg-warning/20 transition-colors"
                      >
                        Submit for Approval
                      </button>
                    )}
                    {rel.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleApprove(rel.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-success/40 bg-success/10 text-success font-medium hover:bg-success/20 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {(rel.status === 'APPROVED' || rel.status === 'DEPLOYED') && envRels.length < 3 && (
                      <button
                        onClick={() => handlePromote(rel.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-medium hover:bg-accent-blue/20 transition-colors"
                      >
                        Promote Next
                      </button>
                    )}
                    {(rel.status === 'SUPERSEDED' || (rel.status === 'APPROVED' && envRels.length > 0)) && (
                      <button
                        onClick={() => setRollbackTargetId(rel.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/5 text-danger font-medium hover:bg-danger/10 transition-colors"
                      >
                        Rollback to this version
                      </button>
                    )}
                    {rel.camelYaml && (
                      <button
                        onClick={() => setPreviewYaml(previewYaml === rel.id ? null : rel.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border-soft bg-bg-canvas text-text-muted font-medium hover:border-primary/30 hover:text-primary transition-colors"
                      >
                        {previewYaml === rel.id ? 'Hide' : 'View'} Camel YAML
                      </button>
                    )}
                  </div>

                  {/* YAML preview */}
                  {previewYaml === rel.id && rel.camelYaml && (
                    <pre className="mt-3 p-3 bg-bg-canvas rounded-lg border border-border-soft text-xs font-mono text-text-muted overflow-x-auto max-h-64">
                      {rel.camelYaml}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rollback confirmation dialog */}
      {rollbackTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Confirm rollback">
          <div className="absolute inset-0 bg-[#0F172A]/30 backdrop-blur-[1px]" onClick={() => setRollbackTargetId(null)} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-surface border border-border-soft shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-danger">history</span>
              <h2 className="text-[15px] font-bold text-text-main">Confirm Rollback</h2>
            </div>
            <p className="text-sm text-text-muted">
              This will roll back the active deployment to version{' '}
              <span className="font-mono font-semibold text-text-main">
                {releases.find((r) => r.id === rollbackTargetId)?.version}
              </span>. The current deployment will be marked as superseded.
            </p>
            <div>
              <label htmlFor="rollback-reason" className="block text-[12px] font-semibold text-text-main mb-1.5">Reason (optional)</label>
              <textarea
                id="rollback-reason"
                rows={3}
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="e.g. data quality issue found in prod after deploy"
                className="w-full rounded-lg border border-border-soft bg-background-light px-3 py-2 text-sm text-text-main resize-none focus:outline-none focus:ring-1 focus:ring-danger/30 focus:border-danger/40"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setRollbackTargetId(null); setRollbackReason(''); }}
                className="px-4 py-2 rounded-lg border border-border-soft text-sm text-text-muted hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rollbackLoading}
                onClick={handleRollback}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-danger/90 transition-colors disabled:opacity-60"
              >
                {rollbackLoading ? 'Rolling back…' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
