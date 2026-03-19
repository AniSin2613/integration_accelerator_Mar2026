export const DASHBOARD_VIEW_STATES = ['loading', 'empty', 'demo'] as const;

export type DashboardViewState = (typeof DASHBOARD_VIEW_STATES)[number];

export function toDashboardViewState(value?: string): DashboardViewState {
  if (value && DASHBOARD_VIEW_STATES.includes(value as DashboardViewState)) {
    return value as DashboardViewState;
  }
  return 'empty';
}

export interface WorkspaceSummary {
  workspace: string;
  environment: string;
  activeIntegrations: number;
  openIssues: number;
  lastDeployment: string;
}

export interface AttentionMetric {
  id: 'failed-runs' | 'pending-approvals' | 'connection-issues' | 'replay-queue';
  label: string;
  icon: string;
  count: number;
  actionLabel?: string;
}

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  tone?: KpiTone;
}

export type IntegrationStatus = 'Healthy' | 'Warning' | 'Draft';

export interface IntegrationRow {
  id: string;
  name: string;
  templateType: string;
  environment: string;
  lastRun: string;
  status: IntegrationStatus;
}

export type ReleaseStatus = 'Approved' | 'Live';

export interface ReleaseRow {
  id: string;
  name: string;
  path: string;
  status: ReleaseStatus;
  time: string;
}

export interface GuidanceSignal {
  id: string;
  label: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  icon: string;
  message: string;
  time: string;
}

export interface DashboardData {
  workspaceSummary: WorkspaceSummary;
  needsAttention: AttentionMetric[];
  kpis: KpiMetric[];
  integrations: IntegrationRow[];
  releases: ReleaseRow[];
  guidanceSignals: GuidanceSignal[];
  recentActivity: ActivityItem[];
}
