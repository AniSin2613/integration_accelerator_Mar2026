'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { type IntegrationOverviewViewState, type IntegrationEnvironment, type IntegrationHeaderData } from './types';

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
  const isLoading = viewState === 'loading';
  const isDraft = viewState === 'draft';

  const data = isLoading ? null : getIntegrationOverviewData(viewState);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    () => data?.header.currentVersionId ?? '—',
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [promoteTarget, setPromoteTarget] = useState<IntegrationEnvironment | null>(null);

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
                // TODO: POST auditPayload to /api/integrations/:id/promotions
                console.info('[Promote action]', auditPayload);
                setPromoteTarget(null);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

