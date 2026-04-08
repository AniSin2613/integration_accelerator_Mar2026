'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { IntegrationOverviewHeader } from './IntegrationOverviewHeader';
import { IntegrationOverviewSkeleton } from './IntegrationOverviewSkeleton';
import { IntegrationSummaryStrip } from './IntegrationSummaryStrip';
import { OperationalHighlights } from './OperationalHighlights';
import { RecentReleasesPanel } from './RecentReleasesPanel';
import { RecentRunsPanel } from './RecentRunsPanel';
import { WorkflowPreview } from './WorkflowPreview';
import { ReleaseReadinessPanel } from './ReleaseReadinessPanel';
import { PromoteDrawer } from './PromoteDrawer';
import { SelectedNodeDetails } from './SelectedNodeDetails';
import { getIntegrationOverviewData } from './mockData';
import {
  type IntegrationOverviewViewState,
  type IntegrationEnvironment,
  type IntegrationHeaderData,
  type IntegrationOverviewData,
  type IntegrationStatus,
  type ApprovalState,
  type RecentRelease,
  type WorkflowBlock,
  type EnvironmentData,
} from './types';

const LOADING_HEADER: IntegrationHeaderData = {
  name: 'Loading integration...',
  templateType: '—',
  workspace: '—',
  currentEnvironment: 'Dev',
  availableEnvironments: ['Dev'],
  versions: [{ id: '—', label: '—', isCurrentDraft: false }],
  currentVersionId: '—',
};

interface IntegrationOverviewPageProps {
  integrationId: string;
  viewState: IntegrationOverviewViewState;
}

interface ApiIntegration {
  id: string;
  name?: string | null;
  status?: string | null;
  draftVersion?: number | null;
  readinessStatus?: string | null;
  lastTestStatus?: string | null;
  lastTestAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  sourceState?: unknown;
  targetState?: unknown;
  triggerState?: unknown;
  validationState?: unknown;
  operationsState?: unknown;
  workspace?: { slug?: string | null } | null;
  templateVersion?: {
    templateDefinition?: {
      name?: string | null;
      sourceSystem?: string | null;
      targetSystem?: string | null;
    } | null;
  } | null;
  mappingSets?: Array<{
    rules?: Array<unknown>;
  }>;
  testRuns?: Array<{
    id: string;
    status: 'SUCCESS' | 'FAILED';
    createdAt: string;
  }>;
  releaseArtifacts?: Array<{
    id: string;
    version: string;
    status: string;
    createdAt: string;
    environmentReleases?: Array<{
      environment?: {
        type?: 'DEV' | 'TEST' | 'PROD';
      } | null;
    }>;
  }>;
}

interface ApiReadiness {
  readinessStatus?: string;
  checks?: {
    sourceConfigured?: boolean;
    targetConfigured?: boolean;
    triggerConfigured?: boolean;
    hasMappings?: boolean;
    mappingRuleCount?: number;
    validationConfigured?: boolean;
    validationRuleCount?: number;
    lastTestStatus?: string | null;
    blockedByProfileLifecycle?: boolean;
  };
}

interface ApiRelease {
  id: string;
  version: string;
  status: string;
  createdAt: string;
  environmentReleases?: Array<{
    environment?: { type?: 'DEV' | 'TEST' | 'PROD' };
    deployedAt?: string;
  }>;
}

function minutesSince(timestamp?: string | null): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function formatRelativeTime(timestamp?: string | null): string {
  const minutes = minutesSince(timestamp);
  if (minutes == null) return '--';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toUiStatus(integration: ApiIntegration, readiness?: ApiReadiness | null): IntegrationStatus {
  if (String(integration.status ?? '').toUpperCase() === 'DRAFT') return 'Draft';
  if (String(integration.lastTestStatus ?? '').toLowerCase() === 'error') return 'Failed';
  const status = String(readiness?.readinessStatus ?? integration.readinessStatus ?? '').toUpperCase();
  if (status.includes('READY') || status.includes('TEST_PASSED')) return 'Healthy';
  if (status.includes('VALIDATION') || status.includes('INCOMPLETE')) return 'Warning';
  return 'Draft';
}

function deriveReleasePath(release: ApiRelease): string {
  const deployedTypes = new Set((release.environmentReleases ?? []).map((row) => row.environment?.type));
  if (deployedTypes.has('PROD')) return 'Test → Prod';
  if (deployedTypes.has('TEST')) return 'Dev → Test';
  return 'Dev → Test';
}

function toOverviewData(integration: ApiIntegration, readiness: ApiReadiness | null, releases: ApiRelease[]): IntegrationOverviewData {
  const uiStatus = toUiStatus(integration, readiness);
  const sourceSystem = integration.templateVersion?.templateDefinition?.sourceSystem ?? 'Source';
  const targetSystem = integration.templateVersion?.templateDefinition?.targetSystem ?? 'Target';
  const owner = integration.updatedBy ?? integration.createdBy ?? 'Unassigned';
  const version = `v${integration.draftVersion ?? 1}`;
  const readinessChecks = readiness?.checks;

  const checks = [
    {
      id: 'source',
      label: 'Source configured',
      passed: Boolean(readinessChecks?.sourceConfigured),
      detail: readinessChecks?.sourceConfigured ? undefined : 'Configure source connection and object.',
    },
    {
      id: 'target',
      label: 'Target configured',
      passed: Boolean(readinessChecks?.targetConfigured),
      detail: readinessChecks?.targetConfigured ? undefined : 'Configure target connection and object.',
    },
    {
      id: 'trigger',
      label: 'Trigger configured',
      passed: Boolean(readinessChecks?.triggerConfigured),
      detail: readinessChecks?.triggerConfigured ? undefined : 'Set schedule, webhook, or manual trigger.',
    },
    {
      id: 'mapping',
      label: 'Mappings defined',
      passed: Boolean(readinessChecks?.hasMappings),
      detail: readinessChecks?.hasMappings
        ? undefined
        : `No mappings found${typeof readinessChecks?.mappingRuleCount === 'number' ? ` (${readinessChecks.mappingRuleCount})` : ''}.`,
    },
    {
      id: 'validation',
      label: 'Validation rules configured',
      passed: Boolean(readinessChecks?.validationConfigured),
      detail: readinessChecks?.validationConfigured
        ? undefined
        : `No validation rules found${typeof readinessChecks?.validationRuleCount === 'number' ? ` (${readinessChecks.validationRuleCount})` : ''}.`,
    },
  ];

  const blockers = checks.filter((check) => !check.passed).map((check) => check.detail ?? check.label);
  if (readinessChecks?.blockedByProfileLifecycle) {
    blockers.push('Profile lifecycle requires review before release.');
  }

  const mappedReleases: RecentRelease[] = releases.slice(0, 5).map((release) => ({
    id: release.id,
    version: release.version,
    path: deriveReleasePath(release),
    status:
      String(release.status).toUpperCase() === 'DRAFT'
        ? 'Draft' as const
        : String(release.status).toUpperCase() === 'APPROVED'
          ? 'Approved' as const
          : 'Live' as const,
    time: formatRelativeTime(release.createdAt),
  }));

  const runs = (integration.testRuns ?? []).slice(0, 5).map((run, index) => ({
    id: run.id,
    label: `Run #${String(run.id).slice(-6).toUpperCase() || index + 1}`,
    status: run.status === 'FAILED' ? ('Failed' as const) : ('Healthy' as const),
    started: formatRelativeTime(run.createdAt),
    duration: '--',
  }));

  const sourceState = (integration.sourceState as any) ?? {};
  const targetState = (integration.targetState as any) ?? {};
  const triggerState = (integration.triggerState as any) ?? {};
  const validationState = (integration.validationState as any) ?? {};
  const operationsState = (integration.operationsState as any) ?? {};
  const mappingCount = integration.mappingSets?.[0]?.rules?.length ?? 0;
  const validationCount = Array.isArray(validationState?.rules) ? validationState.rules.length : 0;

  const workflowBlocks: WorkflowBlock[] = [
    {
      id: 'trigger',
      nodeKey: 'trigger',
      title: 'Trigger',
      subtitle: triggerState?.triggerType ?? 'Not configured',
      detailRows: [
        { label: 'Type', value: triggerState?.triggerType ?? '--' },
        { label: 'Cron', value: triggerState?.cronExpression || '--' },
        { label: 'Timezone', value: triggerState?.timezone || '--' },
      ],
    },
    {
      id: 'source',
      nodeKey: 'source',
      title: 'Source Connection',
      subtitle: sourceState?.primary?.connectionName || sourceState?.primary?.businessObject || 'Not configured',
      detailRows: [
        { label: 'Connection', value: sourceState?.primary?.connectionName || '--' },
        { label: 'Object', value: sourceState?.primary?.businessObject || '--' },
        { label: 'Operation', value: sourceState?.primary?.operation || '--' },
      ],
    },
    {
      id: 'mapping',
      nodeKey: 'mapping',
      title: 'Mapping',
      subtitle: `${mappingCount} mapping rule${mappingCount === 1 ? '' : 's'}`,
      detailRows: [
        { label: 'Mappings', value: `${mappingCount}` },
        { label: 'Validation Rules', value: `${validationCount}` },
        { label: 'Latest Test', value: formatRelativeTime(integration.lastTestAt) },
      ],
    },
    {
      id: 'target',
      nodeKey: 'target',
      title: 'Target Connection',
      subtitle: targetState?.targets?.[0]?.connectionName || targetState?.targets?.[0]?.businessObject || 'Not configured',
      detailRows: [
        { label: 'Connection', value: targetState?.targets?.[0]?.connectionName || '--' },
        { label: 'Object', value: targetState?.targets?.[0]?.businessObject || '--' },
        { label: 'Operation', value: targetState?.targets?.[0]?.operation || '--' },
      ],
    },
    {
      id: 'operations',
      nodeKey: 'operations',
      title: 'Monitoring',
      subtitle: operationsState?.alertChannel ? `Alerts: ${operationsState.alertChannel}` : 'Default monitoring',
      detailRows: [
        { label: 'Alert Channel', value: operationsState?.alertChannel || '--' },
        { label: 'Retry Enabled', value: operationsState?.enableRetry ? 'Yes' : 'No' },
        { label: 'Diagnostics', value: operationsState?.diagnosticsLevel || '--' },
      ],
    },
  ];

  const baseEnvironmentData: EnvironmentData = {
    summary: {
      status: uiStatus,
      source: sourceSystem,
      target: targetSystem,
      lastRun: formatRelativeTime(integration.lastTestAt),
      lastDeployment: formatRelativeTime(releases[0]?.createdAt ?? null),
      owner,
    },
    highlights: [
      {
        id: 'health',
        label: 'Current Health',
        value: uiStatus,
        tone: uiStatus === 'Healthy' ? 'success' : uiStatus === 'Failed' ? 'danger' : 'warning',
        supportingText: 'Derived from readiness and latest test status.',
      },
      {
        id: 'mappings',
        label: 'Mappings',
        value: `${mappingCount}`,
        tone: mappingCount > 0 ? 'success' : 'warning',
        supportingText: 'Rules in latest mapping set.',
      },
      {
        id: 'validation',
        label: 'Validation Rules',
        value: `${validationCount}`,
        tone: validationCount > 0 ? 'success' : 'warning',
        supportingText: 'Rules currently configured in draft.',
      },
      {
        id: 'last-test',
        label: 'Last Test',
        value: formatRelativeTime(integration.lastTestAt),
        tone: integration.lastTestStatus === 'success' ? 'success' : integration.lastTestStatus === 'error' ? 'danger' : 'neutral',
        supportingText: 'Latest test run timestamp.',
      },
      {
        id: 'releases',
        label: 'Release Artifacts',
        value: `${releases.length}`,
        tone: releases.length > 0 ? 'neutral' : 'warning',
        supportingText: 'Total artifacts created for this integration.',
      },
    ],
    runs,
    releases: mappedReleases,
    readiness: {
      version,
      currentEnvironment: 'Dev' as const,
      promotionTarget: 'Test' as const,
      checks,
      blockers,
      approvalState: (
        releases.some((release) => String(release.status).toUpperCase() === 'SUBMITTED')
          ? 'Pending Approval'
          : releases.some((release) => ['APPROVED', 'DEPLOYED'].includes(String(release.status).toUpperCase()))
            ? 'Approved'
            : 'Not Required'
      ) as ApprovalState,
      canPromoteToTest: String(readiness?.readinessStatus ?? '').toUpperCase() === 'READY_FOR_RELEASE_REVIEW',
      canPromoteToProd: false,
    },
  };

  return {
    header: {
      name: integration.name ?? 'Untitled Integration',
      templateType: integration.templateVersion?.templateDefinition?.name ?? 'Template',
      workspace: integration.workspace?.slug ?? 'Default Workspace',
      currentEnvironment: 'Dev',
      availableEnvironments: ['Dev', 'Test', 'Prod'],
      versions: [
        { id: version, label: `${version} - Draft`, isCurrentDraft: true },
        ...releases.map((release) => ({
          id: release.version,
          label: `${release.version} - ${String(release.status).toUpperCase()}`,
          isCurrentDraft: false,
        })),
      ],
      currentVersionId: version,
    },
    environmentData: {
      Dev: {
        ...baseEnvironmentData,
        readiness: {
          ...baseEnvironmentData.readiness,
          currentEnvironment: 'Dev',
          promotionTarget: 'Test',
        },
      },
      Test: {
        ...baseEnvironmentData,
        releases: mappedReleases.filter((release) => release.path === 'Dev → Test' || release.path === 'Test → Prod'),
        readiness: {
          ...baseEnvironmentData.readiness,
          currentEnvironment: 'Test',
          promotionTarget: 'Prod',
          canPromoteToTest: false,
          canPromoteToProd: false,
        },
      },
      Prod: {
        ...baseEnvironmentData,
        releases: mappedReleases.filter((release) => release.path === 'Test → Prod'),
        readiness: {
          ...baseEnvironmentData.readiness,
          currentEnvironment: 'Prod',
          promotionTarget: null,
          canPromoteToTest: false,
          canPromoteToProd: false,
        },
      },
    },
    workflowBlocks,
    draftMessage: blockers.length > 0 ? 'This integration has blockers before promotion.' : undefined,
  };
}

function draftBannerCopy(environment: IntegrationEnvironment): string {
  if (environment === 'Test') {
    return 'This version is not deployed in this environment and is not yet eligible for promotion to Prod.';
  }
  if (environment === 'Prod') {
    return 'This version has not completed prior promotion steps and is not eligible for deployment in Prod.';
  }
  return 'This version is not deployed in this environment. Resolve readiness blockers before promotion to Test.';
}

function toIntegrationEnvironment(value: string | null): IntegrationEnvironment | null {
  if (value === 'Dev' || value === 'Test' || value === 'Prod') {
    return value;
  }

  return null;
}

export function IntegrationOverviewPage({ integrationId, viewState }: IntegrationOverviewPageProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(viewState === 'loading');
  const [data, setData] = useState<IntegrationOverviewData | null>(
    viewState === 'demo' ? getIntegrationOverviewData('demo') : null,
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    () => data?.header.currentVersionId ?? '—',
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [promoteTarget, setPromoteTarget] = useState<IntegrationEnvironment | null>(null);

  useEffect(() => {
    if (viewState === 'demo') {
      setData(getIntegrationOverviewData('demo'));
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const [integration, readiness, releases] = await Promise.all([
          api.get<ApiIntegration>(`/integrations/${integrationId}`),
          api.get<ApiReadiness>(`/integrations/${integrationId}/readiness`).catch(() => null),
          api.get<ApiRelease[]>(`/integrations/${integrationId}/releases`).catch(() => []),
        ]);
        if (!cancelled) {
          setData(toOverviewData(integration, readiness, releases));
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [integrationId, viewState]);

  const header = data?.header ?? LOADING_HEADER;
  const queryEnvironment = toIntegrationEnvironment(searchParams.get('env'));

  const selectedEnvironment = useMemo<IntegrationEnvironment>(() => {
    if (queryEnvironment && header.availableEnvironments.includes(queryEnvironment)) {
      return queryEnvironment;
    }
    return header.currentEnvironment;
  }, [queryEnvironment, header.availableEnvironments, header.currentEnvironment]);

  const envData = data?.environmentData[selectedEnvironment] ?? null;
  const selectedVersion = header.versions.find((version) => version.id === selectedVersionId) ?? header.versions[0];
  const isDraft = envData?.summary.status === 'Draft';
  const scopedReadiness = envData
    ? {
        ...envData.readiness,
        version: selectedVersion?.id ?? envData.readiness.version,
      }
    : null;

  useEffect(() => {
    if (!data) {
      return;
    }

    const hasSelectedVersion = data.header.versions.some((version) => version.id === selectedVersionId);
    if (!hasSelectedVersion) {
      setSelectedVersionId(data.header.currentVersionId);
    }
  }, [data, selectedVersionId]);

  useEffect(() => {
    if (!data || data.workflowBlocks.length === 0) {
      setSelectedBlockId('');
      return;
    }

    const blockExists = data.workflowBlocks.some((block) => block.id === selectedBlockId);
    if (!blockExists) {
      setSelectedBlockId(data.workflowBlocks[0].id);
    }
  }, [data, selectedBlockId]);

  const selectedBlock = data?.workflowBlocks.find((block) => block.id === selectedBlockId);

  return (
    <div className="space-y-6">
      <IntegrationOverviewHeader
        integrationId={integrationId}
        header={header}
        selectedVersionId={selectedVersionId}
        onVersionChange={setSelectedVersionId}
        isVersionEditable={selectedVersion?.isCurrentDraft ?? false}
        isLoading={isLoading}
      />

      {isLoading || !data || !envData ? (
        <IntegrationOverviewSkeleton />
      ) : (
        <>
          <IntegrationSummaryStrip summary={envData.summary} />

          {isDraft ? (
            <section className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 sm:px-5">
              <p className="text-sm text-warning">{draftBannerCopy(selectedEnvironment)}</p>
            </section>
          ) : null}

          <WorkflowPreview
            blocks={data.workflowBlocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
          />
          <SelectedNodeDetails block={selectedBlock} />

          <ReleaseReadinessPanel
            readiness={scopedReadiness ?? envData.readiness}
            onPromoteToTest={() => setPromoteTarget('Test')}
            onPromoteToProd={() => setPromoteTarget('Prod')}
          />

          <section className="space-y-4">
            <h2 className="text-[15px] font-semibold text-text-muted">Secondary Info</h2>
            <OperationalHighlights cards={envData.highlights} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <RecentRunsPanel
                integrationId={integrationId}
                runs={envData.runs}
                isDraft={isDraft}
                environment={selectedEnvironment}
              />
              <RecentReleasesPanel
                integrationId={integrationId}
                releases={envData.releases}
                isDraft={isDraft}
                environment={selectedEnvironment}
              />
            </div>
          </section>

          {promoteTarget ? (
            <PromoteDrawer
              integrationId={integrationId}
              integrationName={header.name}
              selectedVersion={scopedReadiness?.version ?? envData.readiness.version}
              fromEnvironment={selectedEnvironment}
              toEnvironment={promoteTarget}
              readiness={scopedReadiness ?? envData.readiness}
              onClose={() => setPromoteTarget(null)}
              onConfirm={(note) => {
                // Audit payload — structured for future backend persistence.
                // Wire actor to auth context when available.
                const auditPayload = {
                  actor: 'current-user',
                  timestamp: new Date().toISOString(),
                  action: 'promote' as const,
                  integrationId,
                  integrationName: header.name,
                  version: scopedReadiness?.version ?? envData.readiness.version,
                  fromEnvironment: selectedEnvironment,
                  toEnvironment: promoteTarget,
                  note: note.trim() || null,
                };
                api.post(
                  `/integrations/${integrationId}/versions/${auditPayload.version}/promote`,
                  {
                    toEnvironment: auditPayload.toEnvironment,
                    note: auditPayload.note,
                    actor: auditPayload.actor,
                  }
                ).catch((err: unknown) => {
                  console.error('[Promote] API call failed', err);
                });
                setPromoteTarget(null);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

