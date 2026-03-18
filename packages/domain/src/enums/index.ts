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
