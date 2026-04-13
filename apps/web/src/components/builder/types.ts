/* ------------------------------------------------------------------ */
/*  Integration Builder – Types (Wireframe v5 enterprise studio)      */
/* ------------------------------------------------------------------ */

import { type WorkflowNodeKey } from '@/lib/workflow-node-icons';

export const BUILDER_STEPS = [
  'trigger',
  'sourceGroup',
  'mapping',
  'validation',
  'targetGroup',
  'responseHandling',
  'operations',
] as const;

export type BuilderStepId = (typeof BUILDER_STEPS)[number];

export type StepStatus = 'not-started' | 'in-progress' | 'complete' | 'warning' | 'error';

export interface StepMeta {
  id: BuilderStepId;
  label: string;
  nodeKey: WorkflowNodeKey;
  status: StepStatus;
}

export type TriggerType = 'Schedule / Cron' | 'Webhook' | 'Manual';

export interface TriggerConfig {
  triggerType: TriggerType;
  cronExpression: string;
  timezone: string;
  webhookPath: string;
  webhookMethod: 'POST' | 'PUT';
  manualExecutionEnabled: boolean;
  description: string;
}

export interface KeyValueEntry {
  key: string;
  value: string;
}

export interface SourceConfig {
  connectionId: string;
  connectionName: string;
  connectionFamily: string;
  healthStatus: string;
  businessObject: string;
  operation: string;
  endpointPath: string;
  queryParams: KeyValueEntry[];
  headers: KeyValueEntry[];
  customParams: KeyValueEntry[];
  paginationEnabled: boolean;
  paginationStrategy: 'Offset' | 'Cursor' | 'None';
  pageSize: number;
  incrementalReadMode: 'Off' | 'Timestamp Cursor';
}

export interface SourceEnrichment {
  id: string;
  connectionName: string;
  interfaceName: string;
  purpose: string;
  strategy: 'Lookup' | 'Join' | 'Overlay';
}

export interface SourceGroupConfig {
  primary: SourceConfig;
  enrichmentSources: SourceEnrichment[];
  processingPattern: 'Single Source' | 'Primary + Enrichment' | 'Split / Aggregate';
}

export interface MappingField {
  id: string;
  sourceField: string;
  targetField: string;
  transform: string;
  required: boolean;
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  transformConfig?: string;
}

export interface MappingConfig {
  mappings: MappingField[];
  unmappedSourceFields: string[];
  unmappedTargetFields: string[];
}

export type ValidationSeverity = 'Error' | 'Warning' | 'Info';

export type ValidationOperator =
  | 'IS_NOT_EMPTY'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'IN'
  | 'NOT_IN'
  | 'MATCHES'
  | 'LENGTH_MIN'
  | 'LENGTH_MAX';

export type ValidationRuleSource = 'auto' | 'manual';

export interface ValidationRule {
  id: string;
  name: string;
  field: string;
  operator: ValidationOperator;
  value: string | string[];
  severity: ValidationSeverity;
  enabled: boolean;
  source: ValidationRuleSource;
}

export interface ValidationErrorConfig {
  logEnabled: boolean;
  dlqEnabled: boolean;
  dlqTopic: string;
  notifyChannel: 'Email' | 'Slack' | 'Teams' | 'None';
  notifyRecipients: string;
  includeRecordData: boolean;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  policyMode: 'Balanced' | 'Strict' | 'Lenient';
  errorConfig: ValidationErrorConfig;
}

export type WriteMode = 'Create' | 'Upsert' | 'Update';

export interface TargetConfig {
  connectionId: string;
  connectionName: string;
  connectionFamily: string;
  healthStatus: string;
  businessObject: string;
  operation: string;
  endpointPath: string;
  writeMode: WriteMode;
  upsertKeyField: string;
  batchSize: number;
  params: KeyValueEntry[];
  conflictHandling: 'Overwrite' | 'Skip Existing' | 'Fail on Conflict';
}

export interface TargetDestination extends TargetConfig {
  id: string;
  name: string;
  priority: number;
}

export type TargetProfileStatus = 'none' | 'baseline-only' | 'profile-ready' | 'overlay-active' | 'drift-suspected';

export interface TargetProfileState {
  profileId: string;
  profileName: string;
  system: string;
  object: string;
  isPublished: boolean;
  status: TargetProfileStatus;
  effectiveFieldCount: number;
  effectiveRequiredCount: number;
  currentVersionId: string | null;
}

export interface TargetGroupConfig {
  targets: TargetDestination[];
  deliveryPattern: 'Single Target' | 'Fan-out to Multiple Targets' | 'Scatter-Gather';
  targetProfileState: TargetProfileState | null;
}

export interface ResponseHandlingConfig {
  // Success handling
  successCriteria: 'any_success' | 'only_2xx';
  storeResponse: boolean;
  transformResponse: boolean;

  // Output to source
  outputToSource: 'auto_if_expected' | 'no_response';

  // Notify another system
  notificationEnabled: boolean;
  notificationDestinationUrl: string;
  notificationMethod: 'POST' | 'PUT';
  notificationOnSuccess: boolean;
  notificationOnFailure: boolean;
  notificationPayloadMode: 'standard_response' | 'custom_payload';
  notificationCustomPayload?: string;

  // Inline mapping editors (optional JSON strings)
  responseTransformRules?: string;

  // Advanced
  businessErrorTranslationEnabled: boolean;
  loggingLevel: 'Minimal' | 'Standard' | 'Verbose';
  debugMode: boolean;
}

export type AlertChannel = 'Email' | 'Slack' | 'Webhook' | 'None';

export interface MonitoringConfig {
  // Run History
  storeRunHistory: boolean;
  storeErrorDetails: boolean;
  storePayloadSnapshots: boolean;
  retentionDays: number;

  // Failure Recovery
  failureBehavior: 'retry' | 'stop' | 'move_to_failed_queue';
  retryAttempts: number;
  retryInterval: '1 min' | '5 min' | '15 min' | '30 min' | '1 hour';
  partialSuccessPolicy: 'fail_entire_transaction' | 'allow_partial_success';
  afterFinalFailureNotify: boolean;
  afterFinalFailureMarkFailed: boolean;
  afterFinalFailureMoveToQueue: boolean;

  // Alerts
  notifyOnFirstFailure: boolean;
  notifyAfterFinalFailure: boolean;
  notifyOnSuccess: boolean;
  alertRecipients: string;
  notificationType: AlertChannel;

  // Advanced Monitoring
  enableDetailedDiagnostics: boolean;
  includePayloadInAlerts: boolean;
  loggingLevel: 'Minimal' | 'Standard' | 'Verbose';
  debugMode: boolean;
}

export interface BuilderState {
  integrationId: string;
  integrationName: string;
  templateLabel: string;
  versionLabel: string;
  validationStatus: 'Not validated' | 'Valid' | 'Warnings';
  environment: 'Dev' | 'Test' | 'Prod';
  activeStep: BuilderStepId;
  steps: StepMeta[];
  trigger: TriggerConfig;
  sourceGroup: SourceGroupConfig;
  mapping: MappingConfig;
  validation: ValidationConfig;
  targetGroup: TargetGroupConfig;
  responseHandling: ResponseHandlingConfig;
  operations: MonitoringConfig;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  selectedMappingId: string | null;
  selectedRuleId: string | null;
}

export type SourceTargetWarning = 'none' | 'warn' | 'block';

export function getSourceTargetWarning(state: BuilderState): SourceTargetWarning {
  const source = state.sourceGroup.primary;
  const target = state.targetGroup.targets[0];
  if (!source.connectionId || !target?.connectionId) return 'none';
  if (source.connectionId !== target.connectionId) return 'none';
  if (
    source.endpointPath === target.endpointPath &&
    source.operation === target.operation &&
    source.businessObject === target.businessObject
  ) {
    return 'block';
  }
  return 'warn';
}

export function isTriggerComplete(t: TriggerConfig): boolean {
  if (t.triggerType === 'Schedule / Cron') return t.cronExpression.trim().length > 0;
  if (t.triggerType === 'Webhook') return t.webhookPath.trim().length > 0;
  return t.manualExecutionEnabled;
}

export function isSourceComplete(s: SourceGroupConfig): boolean {
  const p = s.primary;
  const primaryReady = p.connectionId !== '' && p.businessObject.trim() !== '' && p.endpointPath.trim() !== '';
  if (!primaryReady) return false;
  if (s.processingPattern === 'Primary + Enrichment') return s.enrichmentSources.length > 0;
  return true;
}

export function isMappingComplete(m: MappingConfig): boolean {
  return m.mappings.length > 0 && m.unmappedTargetFields.length === 0;
}

export const DEFAULT_ERROR_CONFIG: ValidationErrorConfig = {
  logEnabled: true,
  dlqEnabled: false,
  dlqTopic: '',
  notifyChannel: 'None',
  notifyRecipients: '',
  includeRecordData: false,
};

export const VALIDATION_OPERATORS: { value: ValidationOperator; label: string; needsValue: boolean }[] = [
  { value: 'IS_NOT_EMPTY', label: 'is not empty', needsValue: false },
  { value: 'EQUALS', label: 'equals', needsValue: true },
  { value: 'NOT_EQUALS', label: 'not equals', needsValue: true },
  { value: 'GREATER_THAN', label: 'greater than', needsValue: true },
  { value: 'LESS_THAN', label: 'less than', needsValue: true },
  { value: 'IN', label: 'in list', needsValue: true },
  { value: 'NOT_IN', label: 'not in list', needsValue: true },
  { value: 'MATCHES', label: 'matches regex', needsValue: true },
  { value: 'LENGTH_MIN', label: 'min length', needsValue: true },
  { value: 'LENGTH_MAX', label: 'max length', needsValue: true },
];

export function isValidationComplete(v: ValidationConfig): boolean {
  return v.rules.length > 0;
}

export function isTargetComplete(t: TargetGroupConfig): boolean {
  if (t.targets.length === 0) return false;
  const primary = t.targets[0];
  const primaryReady = primary.connectionId !== '' && primary.businessObject.trim() !== '' && primary.endpointPath.trim() !== '';
  if (!primaryReady) return false;
  if (t.deliveryPattern === 'Fan-out to Multiple Targets') return t.targets.length > 1;
  return true;
}

export function isResponseHandlingComplete(r: ResponseHandlingConfig): boolean {
  if (r.notificationEnabled && r.notificationDestinationUrl.trim() === '') return false;
  return true;
}

export function isMonitoringComplete(m: MonitoringConfig): boolean {
  return m.storeRunHistory || m.notificationType !== 'None' || m.failureBehavior === 'retry';
}
