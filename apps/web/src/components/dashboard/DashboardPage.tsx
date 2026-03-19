import { DashboardHeader } from './DashboardHeader';
import { DashboardSkeleton } from './DashboardSkeleton';
import { getDashboardData } from './mockData';
import { type DashboardViewState } from './types';
import { IntegrationsOverviewPanel } from './IntegrationsOverviewPanel';
import { NeedsAttentionGrid } from './NeedsAttentionGrid';
import { RecentReleasesPanel } from './RecentReleasesPanel';
import { WorkspaceSnapshotGrid } from './WorkspaceSnapshotGrid';
import { WorkspaceSummaryStrip } from './WorkspaceSummaryStrip';

interface DashboardPageProps {
  viewState: DashboardViewState;
}

export function DashboardPage({ viewState }: DashboardPageProps) {
  const data = getDashboardData(viewState);

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {viewState === 'loading' ? (
        <DashboardSkeleton />
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
