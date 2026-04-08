'use client';

import { useRouter } from 'next/navigation';

interface MappingStudioSummaryCardProps {
  integrationId: string;
  mappedCount: number;
  requiredTotalCount: number;
  requiredMappedCount: number;
  unresolvedRequiredCount: number;
  transformsCount: number;
  lastUpdated?: string | null;
  status?: 'pending' | 'valid' | 'invalid';
}

export function MappingStudioSummaryCard({
  integrationId,
  mappedCount,
  requiredTotalCount,
  requiredMappedCount,
  unresolvedRequiredCount,
  transformsCount,
  lastUpdated,
  status = 'pending',
}: MappingStudioSummaryCardProps) {
  const router = useRouter();

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Never';

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-text-main">Field Mapping Summary</h3>
          <div className="flex items-center gap-2 mt-1">
            {status === 'valid' && (
              <>
                <span className="material-symbols-outlined text-[16px] text-success">check_circle</span>
                <span className="text-[13px] text-success-text font-medium">Complete</span>
              </>
            )}
            {status === 'invalid' && (
              <>
                <span className="material-symbols-outlined text-[16px] text-warning">error</span>
                <span className="text-[13px] text-warning-text font-medium">Issues found</span>
              </>
            )}
            {status === 'pending' && (
              <>
                <span className="material-symbols-outlined text-[16px] text-warning">schedule</span>
                <span className="text-[13px] text-warning-text font-medium">In progress</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/integrations/${integrationId}/mapping`)}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-[18px] bg-primary px-3 text-[12px] font-semibold text-white transition-colors hover:bg-primary/90 shrink-0"
        >
          Edit Mapping
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border-soft bg-background-light p-4">
        {/* Total Mapped */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Mapped</p>
          <p className="text-2xl font-bold text-text-main mt-1">{mappedCount}</p>
          <p className="mt-0.5 text-[13px] text-text-muted">field{mappedCount === 1 ? '' : 's'}</p>
        </div>

        {/* Required Mapped */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Required Mapped</p>
          <p className={`text-2xl font-bold mt-1 ${unresolvedRequiredCount === 0 ? 'text-success-text' : 'text-text-main'}`}>
            {requiredMappedCount} of {requiredTotalCount}
          </p>
          <p className="mt-0.5 text-[13px] text-text-muted">{unresolvedRequiredCount > 0 ? `${unresolvedRequiredCount} missing` : 'complete'}</p>
        </div>

        {/* Unresolved Issues */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Blockers</p>
          <p className={`text-2xl font-bold mt-1 ${unresolvedRequiredCount === 0 ? 'text-success-text' : 'text-warning-text'}`}>
            {unresolvedRequiredCount}
          </p>
          <p className="mt-0.5 text-[13px] text-text-muted">required field{unresolvedRequiredCount === 1 ? '' : 's'}</p>
        </div>

        {/* Transformations */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Transforms</p>
          <p className={`text-2xl font-bold mt-1 ${transformsCount > 0 ? 'text-primary' : 'text-text-main'}`}>
            {transformsCount}
          </p>
          <p className="mt-0.5 text-[13px] text-text-muted">configured</p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-text-muted">Last updated: <span className="font-medium text-text-main">{formattedTime}</span></span>
      </div>

    </div>
  );
}
