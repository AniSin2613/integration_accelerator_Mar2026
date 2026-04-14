/* ── Dashboard data types ── */

export interface WorkspaceInfo {
  name: string;
  environment: string;
  totalIntegrations: number;
  totalConnections: number;
}

export interface DashboardKpis {
  totalIntegrations: number;
  activeIntegrations: number;
  draftIntegrations: number;
  connectedSystems: string;       // "4/6"
  failingConnections: number;
  untestedConnections: number;
  totalRuns: number;
  successRate: string | null;      // "95.2" or null
  avgDurationSec: string | null;   // "4.2" or null
  lastDeployment: string | null;
}

export interface AttentionItem {
  id: string;
  label: string;
  icon: string;
  count: number;
  href: string;
}

export type IntegrationStatus = 'Healthy' | 'Warning' | 'Draft';

export interface IntegrationRow {
  id: string;
  name: string;
  templateType: string;
  environment: string;
  lastRun: string;
  status: IntegrationStatus;
}

export type ConnectionHealth = 'healthy' | 'failing' | 'untested';

export interface ConnectionRow {
  id: string;
  name: string;
  type: string;
  system: string;
  health: ConnectionHealth;
  lastTest: string;
  latencyMs: number | null;
}

export interface ActivityItem {
  id: string;
  icon: string;
  message: string;
  time: string;
}

export interface FailureItem {
  id: string;
  integration: string;
  error: string;
  time: string;
}

export interface DashboardData {
  workspace: WorkspaceInfo;
  kpis: DashboardKpis;
  needsAttention: AttentionItem[];
  integrations: IntegrationRow[];
  connections: ConnectionRow[];
  recentActivity: ActivityItem[];
  recentFailures: FailureItem[];
}
