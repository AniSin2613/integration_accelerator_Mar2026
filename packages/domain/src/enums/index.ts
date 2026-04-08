// ── Environment ──────────────────────────────────────────────────────────────
export enum EnvironmentType {
  DEV = 'DEV',
  TEST = 'TEST',
  PROD = 'PROD',
}

// ── Roles ────────────────────────────────────────────────────────────────────
export enum UserRole {
  VIEWER = 'VIEWER',
  BUILDER = 'BUILDER',
  RELEASE_MANAGER = 'RELEASE_MANAGER',
  ADMIN = 'ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

// ── Templates ────────────────────────────────────────────────────────────────
export enum TemplateClass {
  CERTIFIED = 'CERTIFIED',
  STARTER = 'STARTER',
}

export enum BusinessObject {
  VENDOR = 'VENDOR',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  INVOICE = 'INVOICE',
  REQUISITION = 'REQUISITION',
  SUPPLIER = 'SUPPLIER',
  SUPPLIER_INFORMATION = 'SUPPLIER_INFORMATION',
  LOOKUP = 'LOOKUP',
  LOOKUP_VALUE = 'LOOKUP_VALUE',
  RECEIVING_TRANSACTION = 'RECEIVING_TRANSACTION',
  INVENTORY_TRANSACTION = 'INVENTORY_TRANSACTION',
  APPROVAL = 'APPROVAL',
  GENERIC = 'GENERIC',
}

// ── Connections ───────────────────────────────────────────────────────────────
export enum ConnectionFamily {
  REST_OPENAPI = 'REST_OPENAPI',
  SFTP_FILE = 'SFTP_FILE',
  JDBC_SQL = 'JDBC_SQL',
  S3 = 'S3',
  WEBHOOK = 'WEBHOOK',
  SCHEDULER = 'SCHEDULER',
}

// ── Integrations & Releases ───────────────────────────────────────────────────
export enum IntegrationStatus {
  DRAFT = 'DRAFT',
  IN_TEST = 'IN_TEST',
  LIVE = 'LIVE',
  ATTENTION_NEEDED = 'ATTENTION_NEEDED',
  PAUSED = 'PAUSED',
}

export enum ArtifactStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DEPLOYED = 'DEPLOYED',
}

// ── Mappings ──────────────────────────────────────────────────────────────────
export enum MappingType {
  DIRECT = 'DIRECT',
  CONSTANT = 'CONSTANT',
  DERIVED = 'DERIVED',
  LOOKUP = 'LOOKUP',
  CONDITIONAL = 'CONDITIONAL',
}

export enum MappingStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Zero-trust evidence classes allowed for AI mapping suggestions.
export enum MappingEvidenceSource {
  INTERNAL_APPROVED = 'INTERNAL_APPROVED',
  SOURCE_PLATFORM_OFFICIAL_DOCS = 'SOURCE_PLATFORM_OFFICIAL_DOCS',
  TARGET_PLATFORM_OFFICIAL_DOCS = 'TARGET_PLATFORM_OFFICIAL_DOCS',
  OFFICIAL_OPENAPI_SPEC = 'OFFICIAL_OPENAPI_SPEC',
  OFFICIAL_FIELD_DICTIONARY = 'OFFICIAL_FIELD_DICTIONARY',
  CURATED_SCHEMA_PACK = 'CURATED_SCHEMA_PACK',
}

// ── Target Profiles ──────────────────────────────────────────────────────────
export enum OverlayType {
  FIELD_ALIAS = 'FIELD_ALIAS',
  VALIDATION_RULE = 'VALIDATION_RULE',
  DEFAULT_VALUE = 'DEFAULT_VALUE',
  FIELD_VISIBILITY = 'FIELD_VISIBILITY',
  CUSTOM_TRANSFORM = 'CUSTOM_TRANSFORM',
}

export enum DriftSuggestionType {
  NEW_FIELD = 'NEW_FIELD',
  DEPRECATED_FIELD = 'DEPRECATED_FIELD',
  TYPE_CHANGE = 'TYPE_CHANGE',
  CONSTRAINT_CHANGE = 'CONSTRAINT_CHANGE',
}

export enum DriftSuggestionStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED_CONDITIONAL = 'CONVERTED_CONDITIONAL',
}

export enum RuntimeIssueType {
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNKNOWN_FIELD = 'UNKNOWN_FIELD',
  INVALID_TYPE_OR_FORMAT = 'INVALID_TYPE_OR_FORMAT',
  FORBIDDEN_VALUE = 'FORBIDDEN_VALUE',
  BUSINESS_RULE_REJECTION = 'BUSINESS_RULE_REJECTION',
  AUTH_OR_PERMISSION_ISSUE = 'AUTH_OR_PERMISSION_ISSUE',
  TARGET_CONTRACT_MISMATCH = 'TARGET_CONTRACT_MISMATCH',
  UNKNOWN_TARGET_ERROR = 'UNKNOWN_TARGET_ERROR',
}

export enum DriftSuggestedChange {
  MARK_CUSTOMER_REQUIRED = 'MARK_CUSTOMER_REQUIRED',
  MARK_CONDITIONAL = 'MARK_CONDITIONAL',
  REVIEW_UNKNOWN_FIELD = 'REVIEW_UNKNOWN_FIELD',
  REVIEW_FIELD_TYPE = 'REVIEW_FIELD_TYPE',
  REVIEW_FIELD_VISIBILITY = 'REVIEW_FIELD_VISIBILITY',
}

// ── Readiness & Builder ───────────────────────────────────────────────────────
export enum ReadinessStatus {
  INCOMPLETE = 'INCOMPLETE',
  CONFIGURED = 'CONFIGURED',
  VALIDATION_ISSUES = 'VALIDATION_ISSUES',
  TEST_FAILED = 'TEST_FAILED',
  TEST_PASSED = 'TEST_PASSED',
  READY_FOR_RELEASE_REVIEW = 'READY_FOR_RELEASE_REVIEW',
}

export enum BuilderStatus {
  EDITING = 'EDITING',
  VALIDATING = 'VALIDATING',
  TESTING = 'TESTING',
  COMPLETE = 'COMPLETE',
}

// ── Runtime ────────────────────────────────────────────────────────────────────
export enum RunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
}

// ── Audit ──────────────────────────────────────────────────────────────────────
export enum AuditAction {
  MAPPING_APPROVED = 'MAPPING_APPROVED',
  MAPPING_REJECTED = 'MAPPING_REJECTED',
  RELEASE_SUBMITTED = 'RELEASE_SUBMITTED',
  RELEASE_APPROVED = 'RELEASE_APPROVED',
  RELEASE_REJECTED = 'RELEASE_REJECTED',
  RELEASE_DEPLOYED = 'RELEASE_DEPLOYED',
  INTEGRATION_CREATED = 'INTEGRATION_CREATED',
  INTEGRATION_PAUSED = 'INTEGRATION_PAUSED',
  INTEGRATION_RESUMED = 'INTEGRATION_RESUMED',
  CONNECTION_TESTED = 'CONNECTION_TESTED',
  RUN_REPLAYED = 'RUN_REPLAYED',
}
