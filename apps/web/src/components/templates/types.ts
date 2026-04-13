export const TEMPLATES_VIEW_STATES = ['loading', 'demo', 'empty', 'no-templates'] as const;

export type TemplatesViewState = (typeof TEMPLATES_VIEW_STATES)[number];

export function toTemplatesViewState(value?: string): TemplatesViewState {
  if (value && TEMPLATES_VIEW_STATES.includes(value as TemplatesViewState)) {
    return value as TemplatesViewState;
  }

  return 'demo';
}

export type TemplateGroup = 'Prebuilt' | 'Generic';

export type TemplateCategoryFilter = 'All' | 'Prebuilt Templates' | 'Generic Templates';
export type TemplateSourceFilter =
  | 'All Sources'
  | 'Coupa'
  | 'GEP'
  | 'REST'
  | 'REST API'
  | 'File'
  | 'DB'
  | 'S3';

export type TemplateTargetFilter =
  | 'All Targets'
  | 'SAP'
  | 'Coupa'
  | 'ERP'
  | 'Dynamics'
  | 'REST'
  | 'REST API'
  | 'File'
  | 'DB'
  | 'JSON File'
  | 'XML File'
  | 'Demo JSON'
  | 'Demo XML';

export type TemplateUseCaseFilter =
  | 'All Use Cases'
  | 'Invoices'
  | 'Purchase Orders'
  | 'Vendor Sync'
  | 'Payments'
  | 'REST to REST'
  | 'REST to DB'
  | 'File to REST'
  | 'DB to REST';

export type TemplateSortOption = 'Recommended' | 'Recently Updated' | 'Name A-Z' | 'Most Used';

export type VisibilityScope =
  | 'global'
  | 'internal_only'
  | 'tenant_restricted'
  | 'audience_restricted'
  | 'demo_profile_restricted';

export type AudienceTag = 'coupa' | 'gep' | 'zycus' | 'ivalua' | 'sap' | 'dynamics' | 'general';

export type DemoProfile = 'coupa_demo' | 'gep_demo' | 'generic_enterprise_demo';

export interface TemplateVisibilityContext {
  tenantId: string;
  audienceTag: AudienceTag;
  demoProfile: DemoProfile;
}

export interface TemplateItem {
  id: string;
  name: string;
  group: TemplateGroup;
  categoryLabel: string;
  templateTypeTag: string;
  description: string;
  source: Exclude<TemplateSourceFilter, 'All Sources'>;
  target: Exclude<TemplateTargetFilter, 'All Targets'>;
  useCase: Exclude<TemplateUseCaseFilter, 'All Use Cases'>;
  objectType: string;
  version: string;
  lastUpdated: string;
  updatedDaysAgo: number;
  usageCount: number;

  // Visibility governance (managed by Platform Admin Console)
  isPublished: boolean;
  visibilityScope: VisibilityScope;
  audienceTags: AudienceTag[];
  allowedTenants: string[];
  allowedDemoProfiles: DemoProfile[];
}

export interface TemplatesSummary {
  total: number;
  prebuilt: number;
  generic: number;
  recentlyUpdated: number;
}

export interface TemplatesPageData {
  summary: TemplatesSummary;
  templates: TemplateItem[];
}
