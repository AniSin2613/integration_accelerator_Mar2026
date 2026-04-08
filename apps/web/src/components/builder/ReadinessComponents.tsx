'use client';

import { useState } from 'react';

const READINESS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  INCOMPLETE: { label: 'Incomplete', color: 'border-slate-200 bg-slate-50 text-slate-600', icon: 'pending' },
  CONFIGURED: { label: 'Configured', color: 'border-blue-200 bg-blue-50 text-blue-700', icon: 'settings' },
  VALIDATION_ISSUES: { label: 'Validation Issues', color: 'border-amber-200 bg-amber-50 text-amber-700', icon: 'warning' },
  TEST_FAILED: { label: 'Test Failed', color: 'border-rose-200 bg-rose-50 text-rose-700', icon: 'cancel' },
  TEST_PASSED: { label: 'Test Passed', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: 'check_circle' },
  READY_FOR_RELEASE_REVIEW: { label: 'Ready for Release Review', color: 'border-ai/20 bg-ai-bg text-ai-text', icon: 'verified' },
};

export function IntegrationReadinessBadge({ status }: { status: string }) {
  const cfg = READINESS_CONFIG[status] ?? READINESS_CONFIG.INCOMPLETE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
      <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

export function ReadyForReviewButton({
  integrationId,
  currentStatus,
  onStatusChange,
}: {
  integrationId: string;
  currentStatus: string;
  onStatusChange: (r: any) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (currentStatus === 'READY_FOR_RELEASE_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ai-text">
        <span className="material-symbols-outlined text-[13px]">verified</span>
        Marked for Review
      </span>
    );
  }

  const handleClick = async () => {
    setSubmitting(true);
    try {
      const { api } = await import('@/lib/api-client');
      const result = await api.post<any>(`/integrations/${integrationId}/ready-for-review`, {});
      onStatusChange(result);
    } catch {
      // Could show error toast — for now just reset
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="inline-flex items-center gap-1 rounded-lg bg-ai px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-ai-text disabled:opacity-50 transition-colors"
    >
      <span className="material-symbols-outlined text-[13px]">{submitting ? 'hourglass_empty' : 'verified'}</span>
      {submitting ? 'Submitting…' : 'Mark Ready for Review'}
    </button>
  );
}

export function DraftVersionBar({
  versionLabel,
  lastSavedAt,
  readinessStatus,
}: {
  versionLabel: string;
  lastSavedAt: string | null;
  readinessStatus: string;
}) {
  const cfg = READINESS_CONFIG[readinessStatus] ?? READINESS_CONFIG.INCOMPLETE;
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <span className="inline-flex items-center rounded-full border border-border-soft bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-text-muted">
        {versionLabel}
      </span>
      {lastSavedAt && (
        <span className="text-[10px] text-text-muted">
          Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <IntegrationReadinessBadge status={readinessStatus} />
    </div>
  );
}
