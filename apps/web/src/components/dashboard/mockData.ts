import {
  type DashboardData,
  type DashboardViewState,
} from './types';

const emptyDashboardData: DashboardData = {
  workspaceSummary: {
    workspace: 'Default Workspace',
    environment: 'Dev',
    activeIntegrations: 0,
    openIssues: 0,
    lastDeployment: '--',
  },
  needsAttention: [
    { id: 'failed-runs', label: 'Failed Runs', icon: 'error', count: 0, actionLabel: 'Review' },
    { id: 'pending-approvals', label: 'Pending Approvals', icon: 'approval', count: 0, actionLabel: 'Review' },
    { id: 'connection-issues', label: 'Connection Issues', icon: 'cable', count: 0, actionLabel: 'Review' },
    { id: 'replay-queue', label: 'Replay Queue', icon: 'replay', count: 0, actionLabel: 'Review' },
  ],
  kpis: [
    { id: 'active-integrations', label: 'Active Integrations', value: '0', tone: 'neutral' },
    { id: 'healthy-integrations', label: 'Healthy Integrations', value: '0', tone: 'success' },
    { id: 'success-rate', label: 'Success Rate', value: '--', tone: 'neutral' },
    { id: 'last-deployment', label: 'Last Deployment', value: '--', tone: 'neutral' },
  ],
  integrations: [],
  releases: [],
  guidanceSignals: [],
  recentActivity: [],
};

const demoDashboardData: DashboardData = {
  workspaceSummary: {
    workspace: 'Default Workspace',
    environment: 'Dev',
    activeIntegrations: 3,
    openIssues: 1,
    lastDeployment: '1h ago',
  },
  needsAttention: [
    { id: 'failed-runs', label: 'Failed Runs', icon: 'error', count: 3, actionLabel: 'Review' },
    { id: 'pending-approvals', label: 'Pending Approvals', icon: 'approval', count: 2, actionLabel: 'Review' },
    { id: 'connection-issues', label: 'Connection Issues', icon: 'cable', count: 1, actionLabel: 'Review' },
    { id: 'replay-queue', label: 'Replay Queue', icon: 'replay', count: 4, actionLabel: 'Review' },
  ],
  kpis: [
    { id: 'active-integrations', label: 'Active Integrations', value: '3', tone: 'neutral' },
    { id: 'healthy-integrations', label: 'Healthy Integrations', value: '2', tone: 'success' },
    { id: 'success-rate', label: 'Success Rate', value: '96.4%', tone: 'success' },
    { id: 'last-deployment', label: 'Last Deployment', value: '1h ago', tone: 'neutral' },
  ],
  integrations: [
    {
      id: 'int-1',
      name: 'Coupa Invoice to SAP',
      templateType: 'Certified Template',
      environment: 'Prod',
      lastRun: '2 min ago',
      status: 'Healthy',
    },
    {
      id: 'int-2',
      name: 'REST to REST Order Sync',
      templateType: 'Starter Template',
      environment: 'Test',
      lastRun: '14 min ago',
      status: 'Warning',
    },
    {
      id: 'int-3',
      name: 'Vendor Sync to ERP',
      templateType: 'Certified Template',
      environment: 'Dev',
      lastRun: '1 hour ago',
      status: 'Draft',
    },
  ],
  releases: [
    {
      id: 'rel-1',
      name: 'Invoice Sync v1.2',
      path: 'Dev to Test',
      status: 'Approved',
      time: '1h ago',
    },
    {
      id: 'rel-2',
      name: 'Vendor Sync v2.0',
      path: 'Test to Prod',
      status: 'Live',
      time: '3h ago',
    },
  ],
  guidanceSignals: [
    { id: 'gs-1', label: 'Pending mapping reviews', count: 2 },
    { id: 'gs-2', label: 'Release awaiting approval', count: 1 },
    { id: 'gs-3', label: 'Connection health warning', count: 1 },
  ],
  recentActivity: [
    { id: 'act-1', icon: 'check_circle', message: 'Connection tested successfully', time: '12m ago' },
    { id: 'act-2', icon: 'schema', message: 'Mapping updated for Vendor Sync', time: '24m ago' },
    { id: 'act-3', icon: 'publish', message: 'Release promoted from Dev to Test', time: '1h ago' },
    { id: 'act-4', icon: 'replay', message: 'Replay completed for failed invoice items', time: '2h ago' },
  ],
};

export function getDashboardData(viewState: DashboardViewState): DashboardData {
  return viewState === 'demo' ? demoDashboardData : emptyDashboardData;
}
