import {
  type TemplateItem,
  type TemplateVisibilityContext,
  type TemplatesPageData,
  type TemplatesViewState,
} from './types';

const demoTemplates: TemplatesPageData['templates'] = [
  {
    id: 'tpl-coupa-invoice-sap',
    name: 'Coupa Invoice to SAP',
    group: 'Prebuilt',
    categoryLabel: 'Prebuilt Template',
    templateTypeTag: 'Business Accelerator',
    description: 'Invoice sync from Coupa to SAP with ready mappings and validations.',
    source: 'Coupa',
    target: 'SAP',
    useCase: 'Invoices',
    objectType: 'Invoice',
    version: 'v1.3',
    lastUpdated: '2 days ago',
    updatedDaysAgo: 2,
    usageCount: 87,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['coupa', 'sap'],
    allowedTenants: [],
    allowedDemoProfiles: ['coupa_demo', 'generic_enterprise_demo'],
  },
  {
    id: 'tpl-coupa-po-sap',
    name: 'Coupa Purchase Order to SAP',
    group: 'Prebuilt',
    categoryLabel: 'Prebuilt Template',
    templateTypeTag: 'Business Accelerator',
    description: 'Purchase order flow from Coupa to SAP with production-safe defaults.',
    source: 'Coupa',
    target: 'SAP',
    useCase: 'Purchase Orders',
    objectType: 'Purchase Order',
    version: 'v1.1',
    lastUpdated: '6 days ago',
    updatedDaysAgo: 6,
    usageCount: 63,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['coupa', 'sap'],
    allowedTenants: [],
    allowedDemoProfiles: ['coupa_demo', 'generic_enterprise_demo'],
  },
  {
    id: 'tpl-vendor-sync-erp',
    name: 'Vendor Sync to ERP',
    group: 'Generic',
    categoryLabel: 'Generic Template',
    templateTypeTag: 'Technical Starter',
    description: 'Vendor master sync template with delta handling and monitoring defaults.',
    source: 'REST API',
    target: 'ERP',
    useCase: 'Vendor Sync',
    objectType: 'Vendor',
    version: 'v2.0',
    lastUpdated: '1 day ago',
    updatedDaysAgo: 1,
    usageCount: 58,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['general'],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo'],
  },
  {
    id: 'tpl-gep-invoice-erp',
    name: 'GEP Invoice to ERP',
    group: 'Prebuilt',
    categoryLabel: 'Prebuilt Template',
    templateTypeTag: 'Business Accelerator',
    description: 'Invoice handoff from GEP to ERP with required checks and exception routing.',
    source: 'GEP',
    target: 'ERP',
    useCase: 'Invoices',
    objectType: 'Invoice',
    version: 'v1.0',
    lastUpdated: '4 days ago',
    updatedDaysAgo: 4,
    usageCount: 41,
    isPublished: false,
    visibilityScope: 'internal_only',
    audienceTags: ['gep'],
    allowedTenants: [],
    allowedDemoProfiles: ['gep_demo'],
  },
  {
    id: 'tpl-rest-rest',
    name: 'REST to REST',
    group: 'Generic',
    categoryLabel: 'Generic Template',
    templateTypeTag: 'Technical Starter',
    description: 'Generic API-to-API starter with mapping hooks and baseline retry/error handling.',
    source: 'REST API',
    target: 'REST API',
    useCase: 'REST to REST',
    objectType: 'API Payload',
    version: 'v1.4',
    lastUpdated: '3 days ago',
    updatedDaysAgo: 3,
    usageCount: 112,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['general'],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo'],
  },
  {
    id: 'tpl-rest-db',
    name: 'REST to DB',
    group: 'Generic',
    categoryLabel: 'Generic Template',
    templateTypeTag: 'Technical Starter',
    description: 'API-to-database starter with schema mapping placeholders and upsert strategy.',
    source: 'REST API',
    target: 'DB',
    useCase: 'REST to DB',
    objectType: 'Data Sync',
    version: 'v1.2',
    lastUpdated: '8 days ago',
    updatedDaysAgo: 8,
    usageCount: 76,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['general'],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo'],
  },
  {
    id: 'tpl-file-rest',
    name: 'File to REST',
    group: 'Generic',
    categoryLabel: 'Generic Template',
    templateTypeTag: 'Technical Starter',
    description: 'File ingestion starter with parsing, validation checkpoints, and REST publishing.',
    source: 'File',
    target: 'REST API',
    useCase: 'File to REST',
    objectType: 'Batch File',
    version: 'v1.1',
    lastUpdated: '12 days ago',
    updatedDaysAgo: 12,
    usageCount: 51,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['general'],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo'],
  },
  {
    id: 'tpl-db-rest',
    name: 'DB to REST',
    group: 'Generic',
    categoryLabel: 'Generic Template',
    templateTypeTag: 'Technical Starter',
    description: 'Database outbound starter for publishing changed records to REST endpoints.',
    source: 'DB',
    target: 'REST API',
    useCase: 'DB to REST',
    objectType: 'Data Export',
    version: 'v1.0',
    lastUpdated: '15 days ago',
    updatedDaysAgo: 15,
    usageCount: 46,
    isPublished: true,
    visibilityScope: 'global',
    audienceTags: ['general'],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo'],
  },
];

const noTemplatesData: TemplatesPageData = {
  summary: {
    total: 0,
    prebuilt: 0,
    generic: 0,
    recentlyUpdated: 0,
  },
  templates: [],
};

const DEFAULT_CUSTOMER_VISIBILITY_CONTEXT: TemplateVisibilityContext = {
  tenantId: 'default_tenant',
  audienceTag: 'coupa',
  demoProfile: 'generic_enterprise_demo',
};

function isVisibleToCustomer(template: TemplateItem, context: TemplateVisibilityContext): boolean {
  if (!template.isPublished) {
    return false;
  }

  if (template.visibilityScope === 'global') {
    return true;
  }

  if (template.visibilityScope === 'internal_only') {
    return false;
  }

  if (template.visibilityScope === 'tenant_restricted') {
    return template.allowedTenants.includes(context.tenantId);
  }

  if (template.visibilityScope === 'audience_restricted') {
    return template.audienceTags.includes(context.audienceTag);
  }

  return template.allowedDemoProfiles.includes(context.demoProfile);
}

function toTemplatesPageData(templates: TemplateItem[]): TemplatesPageData {
  return {
    summary: {
      total: templates.length,
      prebuilt: templates.filter((template) => template.group === 'Prebuilt').length,
      generic: templates.filter((template) => template.group === 'Generic').length,
      recentlyUpdated: templates.filter((template) => template.updatedDaysAgo <= 7).length,
    },
    templates,
  };
}

export function getTemplatesPageData(
  viewState: TemplatesViewState,
  visibilityContext: TemplateVisibilityContext = DEFAULT_CUSTOMER_VISIBILITY_CONTEXT,
): TemplatesPageData {
  if (viewState === 'no-templates') {
    return noTemplatesData;
  }

  const visibleTemplates = demoTemplates.filter((template) => isVisibleToCustomer(template, visibilityContext));
  return toTemplatesPageData(visibleTemplates);
}

/** All templates including unpublished/internal — for Platform Admin Console use only. */
export function getAllTemplatesForAdmin(): TemplatesPageData {
  return toTemplatesPageData(demoTemplates);
}
