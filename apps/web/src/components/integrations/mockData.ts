import { type IntegrationsPageData, type IntegrationsViewState } from './types';

const emptyIntegrationsData: IntegrationsPageData = {
  summary: {
    workspace: 'Default Workspace',
    environment: 'Dev',
    totalIntegrations: 0,
    healthy: 0,
    needsAttention: 0,
  },
  rows: [],
};

const demoIntegrationsData: IntegrationsPageData = {
  summary: {
    workspace: 'Default Workspace',
    environment: 'Dev',
    totalIntegrations: 4,
    healthy: 1,
    needsAttention: 2,
  },
  rows: [
    {
      id: 'coupa-invoice-to-sap',
      name: 'Coupa Invoice to SAP',
      templateType: 'Certified Template',
      environment: 'Prod',
      status: 'Healthy',
      lastRun: '2 min ago',
      lastRunMinutes: 2,
      lastUpdated: '1 hour ago',
      lastUpdatedMinutes: 60,
      owner: 'AP Team',
      reviewHref: '/integrations/coupa-invoice-to-sap',
      builderHref: '/integrations/coupa-invoice-to-sap/builder',
      releasesHref: '/integrations/coupa-invoice-to-sap/releases',
    },
    {
      id: 'rest-order-sync',
      name: 'REST Order Sync',
      templateType: 'Starter Template',
      environment: 'Test/UAT',
      status: 'Warning',
      lastRun: '18 min ago',
      lastRunMinutes: 18,
      lastUpdated: '3 hours ago',
      lastUpdatedMinutes: 180,
      owner: 'Integration Team',
      reviewHref: '/integrations/rest-order-sync',
      builderHref: '/integrations/rest-order-sync/builder',
      releasesHref: '/integrations/rest-order-sync/releases',
    },
    {
      id: 'vendor-master-sync',
      name: 'Vendor Master Sync',
      templateType: 'Certified Template',
      environment: 'Dev',
      status: 'Draft',
      lastRun: '--',
      lastRunMinutes: null,
      lastUpdated: '25 min ago',
      lastUpdatedMinutes: 25,
      owner: 'Procurement Ops',
      reviewHref: '/integrations/vendor-master-sync',
      builderHref: '/integrations/vendor-master-sync/builder',
      releasesHref: '/integrations/vendor-master-sync/releases',
    },
    {
      id: 'payment-status-sync',
      name: 'Payment Status Sync',
      templateType: 'Certified Template',
      environment: 'Prod',
      status: 'Failed',
      lastRun: '1 hour ago',
      lastRunMinutes: 60,
      lastUpdated: '2 hours ago',
      lastUpdatedMinutes: 120,
      owner: 'Finance Ops',
      reviewHref: '/integrations/payment-status-sync',
      builderHref: '/integrations/payment-status-sync/builder',
      releasesHref: '/integrations/payment-status-sync/releases',
    },
  ],
};

export function getIntegrationsPageData(viewState: IntegrationsViewState): IntegrationsPageData {
  return viewState === 'demo' ? demoIntegrationsData : emptyIntegrationsData;
}