export const INTEGRATIONS_VIEW_STATES = ['loading', 'empty', 'demo'] as const;

export type IntegrationsViewState = (typeof INTEGRATIONS_VIEW_STATES)[number];

export function toIntegrationsViewState(value?: string): IntegrationsViewState {
  if (value && INTEGRATIONS_VIEW_STATES.includes(value as IntegrationsViewState)) {
    return value as IntegrationsViewState;
  }

  return 'empty';
}

export const STATUS_FILTER_OPTIONS = ['All', 'Draft', 'Healthy', 'Warning', 'Failed', 'Paused'] as const;
export type StatusFilterOption = (typeof STATUS_FILTER_OPTIONS)[number];

export const TEMPLATE_FILTER_OPTIONS = ['All', 'Certified Template', 'Starter Template'] as const;
export type TemplateFilterOption = (typeof TEMPLATE_FILTER_OPTIONS)[number];

export const ENVIRONMENT_FILTER_OPTIONS = ['All', 'Dev', 'Test/UAT', 'Prod'] as const;
export type EnvironmentFilterOption = (typeof ENVIRONMENT_FILTER_OPTIONS)[number];

export const SORT_OPTIONS = ['Recently Updated', 'Name A-Z', 'Name Z-A', 'Last Run', 'Status'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export type IntegrationListStatus = Exclude<StatusFilterOption, 'All'>;
export type IntegrationTemplateType = Exclude<TemplateFilterOption, 'All'>;
export type IntegrationEnvironment = Exclude<EnvironmentFilterOption, 'All'>;

export interface IntegrationsSummary {
  workspace: string;
  environment: string;
  totalIntegrations: number;
  healthy: number;
  needsAttention: number;
}

export interface IntegrationListRow {
  id: string;
  name: string;
  templateType: IntegrationTemplateType;
  environment: IntegrationEnvironment;
  status: IntegrationListStatus;
  lastRun: string;
  lastRunMinutes: number | null;
  lastUpdated: string;
  lastUpdatedMinutes: number;
  owner: string;
  href: string;
}

export interface IntegrationsPageData {
  summary: IntegrationsSummary;
  rows: IntegrationListRow[];
}