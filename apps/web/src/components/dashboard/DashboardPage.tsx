'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSkeleton } from './DashboardSkeleton';
import { type DashboardData } from './types';
import { WorkspaceInfoCard } from './WorkspaceSummaryStrip';
import { HealthChartsRow } from './WorkspaceSnapshotGrid';
import { KpiCardsRow, ActionRequiredRow } from './NeedsAttentionGrid';
import { IntegrationsOverviewPanel } from './IntegrationsOverviewPanel';
import { ConnectionsPanel } from './RecentReleasesPanel';
import { RecentActivityPanel } from './RecentActivityPanel';
import { RecentFailuresPanel } from './ProductGuidancePanel';
import { api } from '@/lib/api-client';

export function DashboardPage() {
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

      {loading ? (
        <DashboardSkeleton />
      ) : !data ? (
        <div className="rounded-xl border border-border-soft bg-surface p-10 text-center">
          <p className="text-[16px] font-semibold text-text-main">Unable to load dashboard</p>
          <p className="text-sm text-text-muted mt-2">Check that the API server is running and try again.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Workspace info (left) + Health Charts (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
            <WorkspaceInfoCard workspace={data.workspace} />
            <HealthChartsRow kpis={data.kpis} />
          </div>

          {/* Row 3: 4 KPI cards */}
          <KpiCardsRow kpis={data.kpis} />

          {/* Row 4: Action Required (hidden when empty) */}
          <ActionRequiredRow items={data.needsAttention} />

          {/* Row 5: Integrations table */}
          <IntegrationsOverviewPanel rows={data.integrations} />

          {/* Row 6: Connections table */}
          <ConnectionsPanel rows={data.connections} />

          {/* Row 7: Recent Activity + Recent Failures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentActivityPanel items={data.recentActivity} />
            <RecentFailuresPanel items={data.recentFailures} />
          </div>
        </>
      )}
    </div>
  );
}
