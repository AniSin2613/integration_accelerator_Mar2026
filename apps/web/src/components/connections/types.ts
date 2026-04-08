/* ------------------------------------------------------------------ */
/*  Filter / sort options                                              */
/* ------------------------------------------------------------------ */

export const CONNECTION_FAMILY_FILTER_OPTIONS = [
  'All Types',
  'REST / OpenAPI outbound',
  'Webhook / HTTP inbound',
  'SFTP / File',
  'Database',
  'S3-compatible storage',
] as const;

export const CONNECTION_STATUS_FILTER_OPTIONS = [
  'All Statuses',
  'Healthy',
  'Warning',
  'Failed',
  'Untested',
] as const;

export const CONNECTION_SORT_OPTIONS = ['Recently Updated', 'Name A-Z', 'Status', 'Last Tested'] as const;

export type ConnectionFamilyFilterOption = (typeof CONNECTION_FAMILY_FILTER_OPTIONS)[number];
export type ConnectionStatusFilterOption = (typeof CONNECTION_STATUS_FILTER_OPTIONS)[number];
export type ConnectionSortOption = (typeof CONNECTION_SORT_OPTIONS)[number];

export type ConnectionStatus = Exclude<ConnectionStatusFilterOption, 'All Statuses'>;
export type ConnectionFamily = Exclude<ConnectionFamilyFilterOption, 'All Types'>;

/* ------------------------------------------------------------------ */
/*  Auth / credential sub-types                                        */
/* ------------------------------------------------------------------ */

export type RestAuthMethod = 'None' | 'API Key' | 'Basic' | 'Bearer Token' | 'OAuth 2.0' | 'Mutual TLS';
export type SftpAuthMode = 'Password' | 'Private Key';
export type S3CredentialMode = 'Access Key / Secret Key' | 'Profile / Default Credentials';

/* ------------------------------------------------------------------ */
/*  Family ↔ backend-enum mapping                                      */
/* ------------------------------------------------------------------ */

export const FAMILY_TO_ENUM: Record<ConnectionFamily, string> = {
  'REST / OpenAPI outbound': 'REST_OPENAPI',
  'Webhook / HTTP inbound': 'WEBHOOK',
  'SFTP / File': 'SFTP_FILE',
  'Database': 'JDBC_SQL',
  'S3-compatible storage': 'S3',
};

export const ENUM_TO_FAMILY: Record<string, ConnectionFamily> = Object.fromEntries(
  Object.entries(FAMILY_TO_ENUM).map(([k, v]) => [v, k as ConnectionFamily]),
) as Record<string, ConnectionFamily>;

/* ------------------------------------------------------------------ */
/*  Config discriminated-union types  (matches backend JSON shape)     */
/* ------------------------------------------------------------------ */

interface BaseConnectionConfig {
  platformLabel?: string;
}

export interface RestOpenApiConnectionConfig extends BaseConnectionConfig {
  family: 'REST / OpenAPI outbound';
  baseUrl: string;
  testPath?: string;
  testMethod?: 'GET' | 'HEAD' | 'POST';
  authMethod: RestAuthMethod;
  apiKeyName?: string;
  apiKeyPlacement?: 'Header' | 'Query';
  apiKeyValueRef?: string;
  basicUsername?: string;
  basicPasswordRef?: string;
  bearerTokenRef?: string;
  oauthClientId?: string;
  oauthClientSecretRef?: string;
  oauthTokenEndpoint?: string;
  oauthScope?: string;
  oauthResourceIndicator?: string;
  oauthAutoRefresh?: boolean;
  oauthAutoRefreshIntervalMin?: number;
  mtlsKeystoreRef?: string;
  mtlsSslContextRef?: string;
  customAuthParams?: Array<{ key: string; value: string }>;
  timeoutMs?: number;
}

export interface WebhookInboundConnectionConfig extends BaseConnectionConfig {
  family: 'Webhook / HTTP inbound';
  path: string;
  methods: string[];
  consumes: string;
  sharedSecretHeader?: string;
  apiKeyHeader?: string;
  basicAuthEnabled?: boolean;
  ipAllowlist?: string;
}

export interface SftpFileConnectionConfig extends BaseConnectionConfig {
  family: 'SFTP / File';
  host: string;
  port: number;
  path: string;
  username: string;
  authMode: SftpAuthMode;
  passwordRef?: string;
  privateKeyRef?: string;
  privateKeyPassphraseRef?: string;
}

export interface DatabaseConnectionConfig extends BaseConnectionConfig {
  family: 'Database';
  dbEngine: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  passwordRef?: string;
  schema?: string;
  sslMode?: string;
}

export interface S3CompatibleConnectionConfig extends BaseConnectionConfig {
  family: 'S3-compatible storage';
  bucket: string;
  region: string;
  credentialMode: S3CredentialMode;
  accessKeyRef?: string;
  secretKeyRef?: string;
  sessionTokenRef?: string;
  customEndpointUrl?: string;
  pathStyleEnabled?: boolean;
  prefix?: string;
}

export type ConnectionConfig =
  | RestOpenApiConnectionConfig
  | WebhookInboundConnectionConfig
  | SftpFileConnectionConfig
  | DatabaseConnectionConfig
  | S3CompatibleConnectionConfig;

/* ------------------------------------------------------------------ */
/*  API response shapes                                                */
/* ------------------------------------------------------------------ */

/** Row returned by GET /connections?slug=… */
export interface ConnectionListItem {
  id: string;
  name: string;
  family: string;
  platformLabel?: string;
  health: string;           // lowercase: 'healthy' | 'warning' | 'failed' | 'untested'
  lastTested: string;       // ISO-8601 or '--'
  updated: string;          // ISO-8601
  usedIn: number;
}

/** Row returned by GET /connections/:id */
export interface ConnectionDetail {
  id: string;
  workspaceId: string;
  name: string;
  family: string;           // backend enum e.g. 'REST_OPENAPI'
  familyLabel: string;      // display label e.g. 'REST / OpenAPI outbound'
  platformLabel?: string;
  config: Record<string, unknown>;
  envBindings: Array<{ id: string; environmentId: string; secretRef: string | null }>;
  testHistory: Array<{ id: string; status: string; testedAt: string; summaryMessage: string }>;
  createdAt: string;
  updatedAt: string;
}

/** Result from POST /connections/:id/test */
export interface ConnectionTestResult {
  connectionId: string;
  environmentId: string;
  status: string;
  testedAt: string;
  latencyMs: number | null;
  summaryMessage: string;
  details: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const HEALTH_DISPLAY: Record<string, ConnectionStatus> = {
  healthy: 'Healthy',
  warning: 'Warning',
  failed: 'Failed',
  untested: 'Untested',
};

export function toDisplayHealth(raw: string): ConnectionStatus {
  return HEALTH_DISPLAY[raw] ?? 'Untested';
}

export function timeAgo(iso: string): string {
  if (!iso || iso === '--') return '--';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Convert a list-endpoint row into a display-ready record */
export interface ConnectionRow {
  id: string;
  name: string;
  family: ConnectionFamily;
  platformLabel?: string;
  health: ConnectionStatus;
  lastTested: string;
  lastTestedAt: string;     // raw ISO for sorting
  updated: string;
  updatedAt: string;        // raw ISO for sorting
  usedIn: number;
}

export function toConnectionRow(item: ConnectionListItem): ConnectionRow {
  return {
    id: item.id,
    name: item.name,
    family: (item.family as ConnectionFamily) || 'REST / OpenAPI outbound',
    platformLabel: item.platformLabel,
    health: toDisplayHealth(item.health),
    lastTested: timeAgo(item.lastTested),
    lastTestedAt: item.lastTested,
    updated: timeAgo(item.updated),
    updatedAt: item.updated,
    usedIn: item.usedIn,
  };
}

export function createDefaultConfig(family: ConnectionFamily): ConnectionConfig {
  if (family === 'REST / OpenAPI outbound') {
    return { family, baseUrl: '', testPath: '', testMethod: 'GET', authMethod: 'None', timeoutMs: 10000 };
  }
  if (family === 'Webhook / HTTP inbound') {
    return { family, path: '/webhook/events', methods: ['POST'], consumes: 'application/json' };
  }
  if (family === 'SFTP / File') {
    return { family, host: '', port: 22, path: '/', username: '', authMode: 'Password' };
  }
  if (family === 'Database') {
    return { family, dbEngine: 'PostgreSQL', host: '', port: 5432, databaseName: '', username: '' };
  }
  return { family: 'S3-compatible storage', bucket: '', region: 'us-east-1', credentialMode: 'Access Key / Secret Key' };
}
