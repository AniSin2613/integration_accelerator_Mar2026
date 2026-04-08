'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSkeleton } from './DashboardSkeleton';
import { type DashboardData, type DashboardViewState } from './types';
import { IntegrationsOverviewPanel } from './IntegrationsOverviewPanel';
import { NeedsAttentionGrid } from './NeedsAttentionGrid';
import { RecentReleasesPanel } from './RecentReleasesPanel';
import { WorkspaceSnapshotGrid } from './WorkspaceSnapshotGrid';
import { WorkspaceSummaryStrip } from './WorkspaceSummaryStrip';
import { api } from '@/lib/api-client';

interface DashboardPageProps {
  viewState: DashboardViewState;
}

export function DashboardPage({ viewState }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<DashboardData>('/dashboard/summary')
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {loading || viewState === 'loading' ? (
        <DashboardSkeleton />
      ) : !data ? (
        <div className="rounded-xl border border-border-soft bg-surface p-10 text-center">
          <p className="text-[16px] font-semibold text-text-main">Unable to load dashboard</p>
          <p className="text-sm text-text-muted mt-2">Check that the API server is running and try again.</p>
        </div>
      ) : (
        <>
          <WorkspaceSummaryStrip summary={data.workspaceSummary} />
          <NeedsAttentionGrid items={data.needsAttention} />
          <WorkspaceSnapshotGrid items={data.kpis} />
          <IntegrationsOverviewPanel rows={data.integrations} />
          <RecentReleasesPanel rows={data.releases} />
        </>
      )}
    </div>
  );
}
