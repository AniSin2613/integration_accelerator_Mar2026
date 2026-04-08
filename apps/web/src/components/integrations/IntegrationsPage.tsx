'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { IntegrationsContextStrip } from './IntegrationsContextStrip';
import { IntegrationsEmptyState } from './IntegrationsEmptyState';
import { IntegrationsFilterBar } from './IntegrationsFilterBar';
import { IntegrationsHeader } from './IntegrationsHeader';
import { IntegrationsSkeleton } from './IntegrationsSkeleton';
import { IntegrationsTable } from './IntegrationsTable';
import {
  type EnvironmentFilterOption,
  type IntegrationListRow,
  type IntegrationsViewState,
  type IntegrationsPageData,
  type SortOption,
  type StatusFilterOption,
  type TemplateFilterOption,
} from './types';
import { api } from '@/lib/api-client';

interface IntegrationsPageProps {
  viewState: IntegrationsViewState;
}

const STATUS_SORT_ORDER: Record<IntegrationListRow['status'], number> = {
  Failed: 0,
  Warning: 1,
  Draft: 2,
  Healthy: 3,
  Paused: 4,
};

function sortRows(rows: IntegrationListRow[], sortBy: SortOption) {
  const nextRows = [...rows];

  if (sortBy === 'Name A-Z') {
    nextRows.sort((left, right) => left.name.localeCompare(right.name));
    return nextRows;
  }

  if (sortBy === 'Name Z-A') {
    nextRows.sort((left, right) => right.name.localeCompare(left.name));
    return nextRows;
  }

  if (sortBy === 'Last Run') {
    nextRows.sort((left, right) => {
      if (left.lastRunMinutes == null) return 1;
      if (right.lastRunMinutes == null) return -1;
      return left.lastRunMinutes - right.lastRunMinutes;
    });
    return nextRows;
  }

  if (sortBy === 'Status') {
    nextRows.sort((left, right) => STATUS_SORT_ORDER[left.status] - STATUS_SORT_ORDER[right.status]);
    return nextRows;
  }

  nextRows.sort((left, right) => left.lastUpdatedMinutes - right.lastUpdatedMinutes);
  return nextRows;
}

interface ApiIntegrationRow {
  id: string;
  name?: string | null;
  status?: string | null;
  readinessStatus?: string | null;
  lastTestStatus?: string | null;
  lastTestAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  createdBy?: string | null;
  workspace?: { slug?: string | null } | null;
  templateVersion?: {
    templateDefinition?: {
      name?: string | null;
      sourceSystem?: string | null;
      targetSystem?: string | null;
    } | null;
  } | null;
}

function computeSummary(rows: IntegrationListRow[]): IntegrationsPageData['summary'] {
  return {
    workspace: 'Default Workspace',
    environment: 'Dev',
    totalIntegrations: rows.length,
    healthy: rows.filter((row) => row.status === 'Healthy').length,
    needsAttention: rows.filter((row) => row.status === 'Warning' || row.status === 'Failed').length,
  };
}

function minutesSince(timestamp?: string | null): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function formatMinutesAgo(minutes: number | null): string {
  if (minutes == null) return '--';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function mapStatus(row: ApiIntegrationRow): IntegrationListRow['status'] {
  if (String(row.status ?? '').toUpperCase() === 'DRAFT') return 'Draft';
  if (String(row.lastTestStatus ?? '').toLowerCase() === 'failed') return 'Failed';
  if (String(row.readinessStatus ?? '').toUpperCase().includes('READY')) return 'Healthy';
  if (String(row.readinessStatus ?? '').toUpperCase().includes('REVIEW')) return 'Warning';
  return 'Draft';
}

function mapTemplateType(row: ApiIntegrationRow): IntegrationListRow['templateType'] {
  return row.templateVersion?.templateDefinition ? 'Certified Template' : 'Starter Template';
}

function toPageData(rows: ApiIntegrationRow[]): IntegrationsPageData {
  const mappedRows: IntegrationListRow[] = rows.map((row) => {
    const lastRunMinutes = minutesSince(row.lastTestAt);
    const lastUpdatedMinutes = minutesSince(row.updatedAt) ?? 0;
    return {
      id: row.id,
      name: row.name ?? 'Untitled Integration',
      templateType: mapTemplateType(row),
      environment: 'Dev',
      status: mapStatus(row),
      lastRun: formatMinutesAgo(lastRunMinutes),
      lastRunMinutes,
      lastUpdated: formatMinutesAgo(lastUpdatedMinutes),
      lastUpdatedMinutes,
      owner: row.updatedBy ?? row.createdBy ?? 'Unassigned',
      reviewHref: `/integrations/${row.id}`,
      builderHref: `/integrations/${row.id}/builder`,
      releasesHref: `/integrations/${row.id}/releases`,
    };
  });

  return {
    summary: {
      ...computeSummary(mappedRows),
      workspace: rows[0]?.workspace?.slug ?? 'Default Workspace',
    },
    rows: mappedRows,
  };
}

export function IntegrationsPage({ viewState }: IntegrationsPageProps) {
  const [loading, setLoading] = useState(viewState === 'loading');
  const [data, setData] = useState<IntegrationsPageData>({
    summary: {
      workspace: 'Default Workspace',
      environment: 'Dev',
      totalIntegrations: 0,
      healthy: 0,
      needsAttention: 0,
    },
    rows: [],
  });
  const [searchValue, setSearchValue] = useState('');
  const [status, setStatus] = useState<StatusFilterOption>('All');
  const [templateType, setTemplateType] = useState<TemplateFilterOption>('All');
  const [environment, setEnvironment] = useState<EnvironmentFilterOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('Recently Updated');
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  const removeRowFromState = (id: string) => {
    setData((prev) => {
      const nextRows = prev.rows.filter((row) => row.id !== id);
      return {
        ...prev,
        summary: {
          ...computeSummary(nextRows),
          workspace: prev.summary.workspace,
        },
        rows: nextRows,
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const rows = await api.get<ApiIntegrationRow[]>('/integrations');
        if (!cancelled) setData(toPageData(rows));
      } catch {
        if (!cancelled) {
          setData({
            summary: {
              workspace: 'Default Workspace',
              environment: 'Dev',
              totalIntegrations: 0,
              healthy: 0,
              needsAttention: 0,
            },
            rows: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <IntegrationsHeader />
        <IntegrationsSkeleton />
      </div>
    );
  }

  const filteredRows = sortRows(
    data.rows.filter((row) => {
      const matchesSearch =
        deferredSearchValue.length === 0 ||
        row.name.toLowerCase().includes(deferredSearchValue) ||
        row.owner.toLowerCase().includes(deferredSearchValue) ||
        row.templateType.toLowerCase().includes(deferredSearchValue);
      const matchesStatus = status === 'All' || row.status === status;
      const matchesTemplateType = templateType === 'All' || row.templateType === templateType;
      const matchesEnvironment = environment === 'All' || row.environment === environment;

      return matchesSearch && matchesStatus && matchesTemplateType && matchesEnvironment;
    }),
    sortBy,
  );

  return (
    <div className="space-y-6">
      <IntegrationsHeader />
      <IntegrationsContextStrip summary={data.summary} />
      <IntegrationsFilterBar
        searchValue={searchValue}
        status={status}
        templateType={templateType}
        environment={environment}
        sortBy={sortBy}
        disabled={data.rows.length === 0}
        onSearchChange={setSearchValue}
        onStatusChange={setStatus}
        onTemplateTypeChange={setTemplateType}
        onEnvironmentChange={setEnvironment}
        onSortChange={setSortBy}
      />
      {data.rows.length === 0 ? (
        <IntegrationsEmptyState />
      ) : (
        <IntegrationsTable
          rows={filteredRows}
          onDelete={async (id) => {
            await api.delete(`/integrations/${id}`);
            removeRowFromState(id);
          }}
        />
      )}
    </div>
  );
}