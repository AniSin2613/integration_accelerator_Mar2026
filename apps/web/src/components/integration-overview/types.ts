export const INTEGRATION_OVERVIEW_VIEW_STATES = ['loading', 'draft', 'demo'] as const;

export type IntegrationOverviewViewState = (typeof INTEGRATION_OVERVIEW_VIEW_STATES)[number];

export function toIntegrationOverviewViewState(value?: string): IntegrationOverviewViewState {
  if (value && INTEGRATION_OVERVIEW_VIEW_STATES.includes(value as IntegrationOverviewViewState)) {
    return value as IntegrationOverviewViewState;
  }

  return 'draft';
}

export type IntegrationStatus = 'Draft' | 'Healthy' | 'Warning' | 'Failed' | 'Paused';
export type IntegrationEnvironment = 'Dev' | 'Test' | 'Prod';

export interface IntegrationVersion {
  id: string;
  /** Display label, e.g. "v1.2 – Live" */
  label: string;
  isCurrentDraft: boolean;
}

export interface IntegrationHeaderData {
  name: string;
  templateType: string;
  workspace: string;
  currentEnvironment: IntegrationEnvironment;
  availableEnvironments: IntegrationEnvironment[];
  versions: IntegrationVersion[];
  currentVersionId: string;
}

export interface IntegrationSummaryStripData {
  status: IntegrationStatus;
  source: string;
  target: string;
  lastRun: string;
  lastDeployment: string;
  owner: string;
}

export interface HighlightCard {
  id: string;
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  supportingText?: string;
}

export interface WorkflowBlock {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  detailRows: Array<{
    label: string;
    value: string;
  }>;
}

export interface RecentRun {
  id: string;
  label: string;
  status: IntegrationStatus;
  started: string;
  duration: string;
}

export interface RecentRelease {
  id: string;
  version: string;
  path: string;
  status: 'Draft' | 'Approved' | 'Live';
  time: string;
}

export type ApprovalState = 'Not Required' | 'Pending Approval' | 'Approved';

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ReleaseReadinessData {
  version: string;
  currentEnvironment: IntegrationEnvironment;
  promotionTarget: IntegrationEnvironment | null;
  checks: ReadinessCheck[];
  blockers: string[];
  approvalState: ApprovalState;
  canPromoteToTest: boolean;
  canPromoteToProd: boolean;
}

export interface EnvironmentData {
  summary: IntegrationSummaryStripData;
  highlights: HighlightCard[];
  runs: RecentRun[];
  releases: RecentRelease[];
  readiness: ReleaseReadinessData;
}

export interface IntegrationOverviewData {
  header: IntegrationHeaderData;
  /** Runtime + readiness data keyed by environment. */
  environmentData: Record<IntegrationEnvironment, EnvironmentData>;
  workflowBlocks: WorkflowBlock[];
  draftMessage?: string;
}
