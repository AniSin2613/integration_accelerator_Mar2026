"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.RunStatus = exports.MappingEvidenceSource = exports.MappingStatus = exports.MappingType = exports.ArtifactStatus = exports.IntegrationStatus = exports.ConnectionFamily = exports.BusinessObject = exports.TemplateClass = exports.UserRole = exports.EnvironmentType = void 0;
// ── Environment ──────────────────────────────────────────────────────────────
var EnvironmentType;
(function (EnvironmentType) {
    EnvironmentType["DEV"] = "DEV";
    EnvironmentType["TEST"] = "TEST";
    EnvironmentType["PROD"] = "PROD";
})(EnvironmentType || (exports.EnvironmentType = EnvironmentType = {}));
// ── Roles ────────────────────────────────────────────────────────────────────
var UserRole;
(function (UserRole) {
    UserRole["VIEWER"] = "VIEWER";
    UserRole["BUILDER"] = "BUILDER";
    UserRole["RELEASE_MANAGER"] = "RELEASE_MANAGER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
// ── Templates ────────────────────────────────────────────────────────────────
var TemplateClass;
(function (TemplateClass) {
    TemplateClass["CERTIFIED"] = "CERTIFIED";
    TemplateClass["STARTER"] = "STARTER";
})(TemplateClass || (exports.TemplateClass = TemplateClass = {}));
var BusinessObject;
(function (BusinessObject) {
    BusinessObject["VENDOR"] = "VENDOR";
    BusinessObject["PURCHASE_ORDER"] = "PURCHASE_ORDER";
    BusinessObject["INVOICE"] = "INVOICE";
    BusinessObject["GENERIC"] = "GENERIC";
})(BusinessObject || (exports.BusinessObject = BusinessObject = {}));
// ── Connections ───────────────────────────────────────────────────────────────
var ConnectionFamily;
(function (ConnectionFamily) {
    ConnectionFamily["REST_OPENAPI"] = "REST_OPENAPI";
    ConnectionFamily["SFTP_FILE"] = "SFTP_FILE";
    ConnectionFamily["JDBC_SQL"] = "JDBC_SQL";
    ConnectionFamily["S3"] = "S3";
    ConnectionFamily["WEBHOOK"] = "WEBHOOK";
    ConnectionFamily["SCHEDULER"] = "SCHEDULER";
})(ConnectionFamily || (exports.ConnectionFamily = ConnectionFamily = {}));
// ── Integrations & Releases ───────────────────────────────────────────────────
var IntegrationStatus;
(function (IntegrationStatus) {
    IntegrationStatus["DRAFT"] = "DRAFT";
    IntegrationStatus["IN_TEST"] = "IN_TEST";
    IntegrationStatus["LIVE"] = "LIVE";
    IntegrationStatus["ATTENTION_NEEDED"] = "ATTENTION_NEEDED";
    IntegrationStatus["PAUSED"] = "PAUSED";
})(IntegrationStatus || (exports.IntegrationStatus = IntegrationStatus = {}));
var ArtifactStatus;
(function (ArtifactStatus) {
    ArtifactStatus["DRAFT"] = "DRAFT";
    ArtifactStatus["SUBMITTED"] = "SUBMITTED";
    ArtifactStatus["APPROVED"] = "APPROVED";
    ArtifactStatus["REJECTED"] = "REJECTED";
    ArtifactStatus["DEPLOYED"] = "DEPLOYED";
})(ArtifactStatus || (exports.ArtifactStatus = ArtifactStatus = {}));
// ── Mappings ──────────────────────────────────────────────────────────────────
var MappingType;
(function (MappingType) {
    MappingType["DIRECT"] = "DIRECT";
    MappingType["CONSTANT"] = "CONSTANT";
    MappingType["DERIVED"] = "DERIVED";
    MappingType["LOOKUP"] = "LOOKUP";
    MappingType["CONDITIONAL"] = "CONDITIONAL";
})(MappingType || (exports.MappingType = MappingType = {}));
var MappingStatus;
(function (MappingStatus) {
    MappingStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    MappingStatus["APPROVED"] = "APPROVED";
    MappingStatus["REJECTED"] = "REJECTED";
})(MappingStatus || (exports.MappingStatus = MappingStatus = {}));
// Zero-trust evidence classes allowed for AI mapping suggestions.
var MappingEvidenceSource;
(function (MappingEvidenceSource) {
    MappingEvidenceSource["INTERNAL_APPROVED"] = "INTERNAL_APPROVED";
    MappingEvidenceSource["SOURCE_PLATFORM_OFFICIAL_DOCS"] = "SOURCE_PLATFORM_OFFICIAL_DOCS";
    MappingEvidenceSource["TARGET_PLATFORM_OFFICIAL_DOCS"] = "TARGET_PLATFORM_OFFICIAL_DOCS";
    MappingEvidenceSource["OFFICIAL_OPENAPI_SPEC"] = "OFFICIAL_OPENAPI_SPEC";
    MappingEvidenceSource["OFFICIAL_FIELD_DICTIONARY"] = "OFFICIAL_FIELD_DICTIONARY";
    MappingEvidenceSource["CURATED_SCHEMA_PACK"] = "CURATED_SCHEMA_PACK";
})(MappingEvidenceSource || (exports.MappingEvidenceSource = MappingEvidenceSource = {}));
// ── Runtime ────────────────────────────────────────────────────────────────────
var RunStatus;
(function (RunStatus) {
    RunStatus["PENDING"] = "PENDING";
    RunStatus["RUNNING"] = "RUNNING";
    RunStatus["SUCCESS"] = "SUCCESS";
    RunStatus["FAILED"] = "FAILED";
    RunStatus["RETRYING"] = "RETRYING";
    RunStatus["CANCELLED"] = "CANCELLED";
})(RunStatus || (exports.RunStatus = RunStatus = {}));
// ── Audit ──────────────────────────────────────────────────────────────────────
var AuditAction;
(function (AuditAction) {
    AuditAction["MAPPING_APPROVED"] = "MAPPING_APPROVED";
    AuditAction["MAPPING_REJECTED"] = "MAPPING_REJECTED";
    AuditAction["RELEASE_SUBMITTED"] = "RELEASE_SUBMITTED";
    AuditAction["RELEASE_APPROVED"] = "RELEASE_APPROVED";
    AuditAction["RELEASE_REJECTED"] = "RELEASE_REJECTED";
    AuditAction["RELEASE_DEPLOYED"] = "RELEASE_DEPLOYED";
    AuditAction["INTEGRATION_CREATED"] = "INTEGRATION_CREATED";
    AuditAction["INTEGRATION_PAUSED"] = "INTEGRATION_PAUSED";
    AuditAction["INTEGRATION_RESUMED"] = "INTEGRATION_RESUMED";
    AuditAction["CONNECTION_TESTED"] = "CONNECTION_TESTED";
    AuditAction["RUN_REPLAYED"] = "RUN_REPLAYED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
//# sourceMappingURL=index.js.map