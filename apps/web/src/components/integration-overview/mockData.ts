import { type IntegrationOverviewData, type IntegrationOverviewViewState, type EnvironmentData } from './types';

// ─── Shared workflow blocks ────────────────────────────────────────────────────

const baseWorkflowBlocks: IntegrationOverviewData['workflowBlocks'] = [
  {
    id: 'trigger',
    nodeKey: 'trigger',
    title: 'Trigger',
    subtitle: 'Scheduled (every 15 min)',
    detailRows: [
      { label: 'Trigger Type', value: 'Scheduled' },
      { label: 'Frequency', value: 'Every 15 minutes' },
      { label: 'Last Updated', value: '2 hours ago' },
    ],
  },
  {
    id: 'source',
    nodeKey: 'source',
    title: 'Source Connection',
    subtitle: 'Coupa Invoices API',
    detailRows: [
      { label: 'Connection', value: 'Coupa Production API' },
      { label: 'Auth', value: 'OAuth 2.0' },
      { label: 'Health', value: 'Healthy' },
    ],
  },
  {
    id: 'mapping',
    nodeKey: 'mapping',
    title: 'Mapping & Transform',
    subtitle: '42 mappings, 6 transforms',
    detailRows: [
      { label: 'Mappings', value: '42 fields' },
      { label: 'Transforms', value: '6 rules' },
      { label: 'Last Updated', value: '1 hour ago' },
    ],
  },
  {
    id: 'validation',
    nodeKey: 'validation',
    title: 'Validation Logic',
    subtitle: '3 required checks',
    detailRows: [
      { label: 'Rules', value: '3 active rules' },
      { label: 'Failure Handling', value: 'Replay queue + alert' },
      { label: 'Last Updated', value: '45 min ago' },
    ],
  },
  {
    id: 'target',
    nodeKey: 'target',
    title: 'Target Connection',
    subtitle: 'SAP Invoice Endpoint',
    detailRows: [
      { label: 'Connection', value: 'SAP S/4 PROD' },
      { label: 'Method', value: 'POST' },
      { label: 'Health', value: 'Healthy' },
    ],
  },
  {
    id: 'monitoring',
    nodeKey: 'monitoring',
    title: 'Monitoring',
    subtitle: 'Alerts + run telemetry',
    detailRows: [
      { label: 'Alert Channel', value: 'AP Ops Slack' },
      { label: 'Error Threshold', value: '>2% failures' },
      { label: 'Last Updated', value: '30 min ago' },
    ],
  },
];

// ─── Draft ────────────────────────────────────────────────────────────────────

const draftDevData: EnvironmentData = {
  summary: {
    status: 'Draft',
    source: 'Coupa',
    target: 'SAP',
    lastRun: '--',
    lastDeployment: '--',
    owner: 'AP Team',
  },
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Not deployed in Dev',
      tone: 'neutral',
      supportingText: 'Deploy this version in Dev to enable runtime health',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '0',
      tone: 'neutral',
      supportingText: 'No active runtime issues',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '--',
      tone: 'neutral',
      supportingText: 'No Dev runs recorded yet',
    },
    {
      id: 'release',
      label: 'Active Version',
      value: 'v0.1 (Draft)',
      tone: 'warning',
      supportingText: 'Incomplete — blocked from promotion',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Configured',
      tone: 'success',
      supportingText: 'Source and target passed setup checks',
    },
  ],
  runs: [],
  releases: [],
  readiness: {
    version: 'v0.1',
    currentEnvironment: 'Dev',
    promotionTarget: 'Test',
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Source and target connections validated', passed: true },
      {
        id: 'mapping',
        label: 'All required field mappings complete',
        passed: false,
        detail: '4 required fields not yet mapped',
      },
      {
        id: 'validation',
        label: 'At least one validation rule active',
        passed: false,
        detail: 'No validation rules have been defined',
      },
      {
        id: 'review',
        label: 'Peer review sign-off received',
        passed: false,
        detail: 'Awaiting reviewer approval',
      },
    ],
    blockers: ['4 required fields not yet mapped', 'No validation rules defined'],
    approvalState: 'Pending Approval',
    canPromoteToTest: false,
    canPromoteToProd: false,
  },
};

const draftTestData: EnvironmentData = {
  ...draftDevData,
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Not deployed in Test',
      tone: 'neutral',
      supportingText: 'This version has not completed the Dev to Test promotion step',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '0',
      tone: 'neutral',
      supportingText: 'No runtime issues in Test for this version',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '--',
      tone: 'neutral',
      supportingText: 'No Test runs recorded yet',
    },
    {
      id: 'release',
      label: 'Promotion State',
      value: 'Awaiting Dev → Test',
      tone: 'warning',
      supportingText: 'This version is not yet eligible for Prod promotion',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Configured',
      tone: 'success',
      supportingText: 'Endpoints are configured but not running in Test',
    },
  ],
  readiness: {
    ...draftDevData.readiness,
    currentEnvironment: 'Test',
    promotionTarget: 'Prod',
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Source and target connections validated', passed: true },
      {
        id: 'mapping',
        label: 'All required field mappings complete',
        passed: false,
        detail: '4 required fields not yet mapped',
      },
      {
        id: 'validation',
        label: 'At least one validation rule active',
        passed: false,
        detail: 'No validation rules have been defined',
      },
      {
        id: 'uat',
        label: 'User acceptance testing completed',
        passed: false,
        detail: 'UAT cannot start until draft is promoted to Test',
      },
    ],
    blockers: [
      '4 required fields not yet mapped',
      'No validation rules defined',
      'UAT not started',
    ],
    approvalState: 'Pending Approval',
    canPromoteToTest: false,
    canPromoteToProd: false,
  },
};

const draftProdData: EnvironmentData = {
  ...draftDevData,
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Not deployed in Prod',
      tone: 'neutral',
      supportingText: 'This version has not completed prior promotion steps',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '0',
      tone: 'neutral',
      supportingText: 'No production runtime for this version',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '--',
      tone: 'neutral',
      supportingText: 'No Prod runs recorded yet',
    },
    {
      id: 'release',
      label: 'Promotion State',
      value: 'Not eligible for Prod',
      tone: 'warning',
      supportingText: 'Dev and Test promotion steps are incomplete',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Configured',
      tone: 'success',
      supportingText: 'Endpoints configured; no production deployment yet',
    },
  ],
  readiness: {
    ...draftDevData.readiness,
    currentEnvironment: 'Prod',
    promotionTarget: null,
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Source and target connections validated', passed: true },
      {
        id: 'change-control',
        label: 'Change control approved',
        passed: false,
        detail: 'No change request exists for this draft version',
      },
    ],
    blockers: ['Draft is not eligible for Prod promotion'],
    approvalState: 'Not Required',
    canPromoteToTest: false,
    canPromoteToProd: false,
  },
};

const draftData: IntegrationOverviewData = {
  header: {
    name: 'Coupa Invoice to SAP',
    templateType: 'Certified Template',
    workspace: 'AP Automation',
    currentEnvironment: 'Dev',
    availableEnvironments: ['Dev', 'Test', 'Prod'],
    versions: [{ id: 'v0.1', label: 'v0.1 – Draft', isCurrentDraft: true }],
    currentVersionId: 'v0.1',
  },
  environmentData: {
    Dev: draftDevData,
    Test: draftTestData,
    Prod: draftProdData,
  },
  workflowBlocks: baseWorkflowBlocks.map((b) => ({ ...b })),
  draftMessage:
    'This integration is in draft. Resolve readiness blockers before promotion.',
};

// ─── Demo: Dev ────────────────────────────────────────────────────────────────

const demoDevData: EnvironmentData = {
  summary: {
    status: 'Healthy',
    source: 'Coupa',
    target: 'SAP',
    lastRun: '2 min ago',
    lastDeployment: '3 hours ago',
    owner: 'AP Team',
  },
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Healthy',
      tone: 'success',
      supportingText: 'Last run completed successfully',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '0 active',
      tone: 'success',
      supportingText: 'No unresolved incidents',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '98.6%',
      tone: 'success',
      supportingText: 'Last 24 hours',
    },
    {
      id: 'release',
      label: 'Active Version',
      value: 'v1.2',
      tone: 'neutral',
      supportingText: 'Deployed in Dev; pending promotion to Test',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Both healthy',
      tone: 'success',
      supportingText: 'No connectivity warnings',
    },
  ],
  runs: [
    { id: 'run-1042', label: 'Run #1042', status: 'Healthy', started: '2 min ago', duration: '1m 24s' },
    { id: 'run-1041', label: 'Run #1041', status: 'Healthy', started: '17 min ago', duration: '1m 18s' },
    { id: 'run-1040', label: 'Run #1040', status: 'Warning', started: '31 min ago', duration: '2m 05s' },
  ],
  releases: [
    { id: 'rel-d-12', version: 'v1.2', path: 'Dev → Test', status: 'Approved', time: '3 hours ago' },
    { id: 'rel-d-11', version: 'v1.1', path: 'Dev → Test', status: 'Approved', time: '1 day ago' },
  ],
  readiness: {
    version: 'v1.3',
    currentEnvironment: 'Dev',
    promotionTarget: 'Test',
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Source and target connections validated', passed: true },
      { id: 'mapping', label: 'All required field mappings complete', passed: true },
      { id: 'validation', label: 'At least one validation rule active', passed: true },
      { id: 'review', label: 'Peer review sign-off received', passed: true },
    ],
    blockers: [],
    approvalState: 'Approved',
    canPromoteToTest: true,
    canPromoteToProd: false,
  },
};

// ─── Demo: Test ───────────────────────────────────────────────────────────────

const demoTestData: EnvironmentData = {
  summary: {
    status: 'Healthy',
    source: 'Coupa',
    target: 'SAP',
    lastRun: '18 min ago',
    lastDeployment: '1 day ago',
    owner: 'AP Team',
  },
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Healthy',
      tone: 'success',
      supportingText: 'Test environment stable',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '1 warning',
      tone: 'warning',
      supportingText: 'Slow response on last ingest',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '96.2%',
      tone: 'success',
      supportingText: 'Last 24 hours',
    },
    {
      id: 'release',
      label: 'Active Version',
      value: 'v1.2',
      tone: 'neutral',
      supportingText: 'Deployed in Test; pending promotion to Prod',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Both healthy',
      tone: 'success',
      supportingText: 'No connectivity warnings',
    },
  ],
  runs: [
    { id: 'run-t-019', label: 'Run #T-019', status: 'Healthy', started: '18 min ago', duration: '1m 52s' },
    { id: 'run-t-018', label: 'Run #T-018', status: 'Healthy', started: '2 hours ago', duration: '1m 40s' },
    { id: 'run-t-017', label: 'Run #T-017', status: 'Warning', started: '5 hours ago', duration: '3m 11s' },
  ],
  releases: [
    { id: 'rel-t-12', version: 'v1.2', path: 'Dev → Test', status: 'Live', time: '1 day ago' },
    { id: 'rel-t-11', version: 'v1.1', path: 'Dev → Test', status: 'Approved', time: '3 days ago' },
  ],
  readiness: {
    version: 'v1.2',
    currentEnvironment: 'Test',
    promotionTarget: 'Prod',
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Source and target connections validated', passed: true },
      { id: 'mapping', label: 'All required field mappings complete', passed: true },
      { id: 'validation', label: 'Validation rules reviewed', passed: true },
      {
        id: 'uat',
        label: 'User acceptance testing completed',
        passed: false,
        detail: 'UAT sign-off pending from AP team lead',
      },
    ],
    blockers: ['UAT sign-off pending from AP team lead'],
    approvalState: 'Pending Approval',
    canPromoteToTest: false,
    canPromoteToProd: false,
  },
};

// ─── Demo: Prod ───────────────────────────────────────────────────────────────

const demoProdData: EnvironmentData = {
  summary: {
    status: 'Healthy',
    source: 'Coupa',
    target: 'SAP',
    lastRun: '4 min ago',
    lastDeployment: '5 days ago',
    owner: 'AP Team',
  },
  highlights: [
    {
      id: 'health',
      label: 'Current Health',
      value: 'Healthy',
      tone: 'success',
      supportingText: 'All production runs nominal',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '0 active',
      tone: 'success',
      supportingText: 'No unresolved incidents',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: '99.4%',
      tone: 'success',
      supportingText: 'Last 7 days',
    },
    {
      id: 'release',
      label: 'Active Version',
      value: 'v1.1',
      tone: 'neutral',
      supportingText: 'Deployed in Prod',
    },
    {
      id: 'connection-health',
      label: 'Connection Health',
      value: 'Both healthy',
      tone: 'success',
      supportingText: 'No connectivity warnings',
    },
  ],
  runs: [
    { id: 'run-p-088', label: 'Run #P-088', status: 'Healthy', started: '4 min ago', duration: '1m 10s' },
    { id: 'run-p-087', label: 'Run #P-087', status: 'Healthy', started: '19 min ago', duration: '1m 05s' },
    { id: 'run-p-086', label: 'Run #P-086', status: 'Healthy', started: '34 min ago', duration: '1m 08s' },
  ],
  releases: [
    { id: 'rel-p-11', version: 'v1.1', path: 'Test → Prod', status: 'Live', time: '5 days ago' },
    { id: 'rel-p-10', version: 'v1.0', path: 'Test → Prod', status: 'Approved', time: '3 weeks ago' },
  ],
  readiness: {
    version: 'v1.1',
    currentEnvironment: 'Prod',
    promotionTarget: null,
    checks: [
      { id: 'workflow', label: 'Workflow steps configured', passed: true },
      { id: 'connections', label: 'Connections validated', passed: true },
      { id: 'mapping', label: 'All mappings complete', passed: true },
      { id: 'validation', label: 'Validation rules active', passed: true },
      { id: 'review', label: 'Change control approved', passed: true },
    ],
    blockers: [],
    approvalState: 'Approved',
    canPromoteToTest: false,
    canPromoteToProd: false,
  },
};

// ─── Demo root ────────────────────────────────────────────────────────────────

const demoData: IntegrationOverviewData = {
  header: {
    name: 'Coupa Invoice to SAP',
    templateType: 'Certified Template',
    workspace: 'AP Automation',
    currentEnvironment: 'Dev',
    availableEnvironments: ['Dev', 'Test', 'Prod'],
    versions: [
      { id: 'v1.3', label: 'v1.3 – Draft', isCurrentDraft: true },
      { id: 'v1.2', label: 'v1.2 – Live', isCurrentDraft: false },
      { id: 'v1.1', label: 'v1.1 – Approved', isCurrentDraft: false },
    ],
    currentVersionId: 'v1.3',
  },
  environmentData: {
    Dev: demoDevData,
    Test: demoTestData,
    Prod: demoProdData,
  },
  workflowBlocks: baseWorkflowBlocks.map((b) => ({ ...b })),
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export function getIntegrationOverviewData(viewState: IntegrationOverviewViewState): IntegrationOverviewData {
  return viewState === 'demo' ? demoData : draftData;
}
