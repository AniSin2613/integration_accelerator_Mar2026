'use client';

import { useDeferredValue, useState } from 'react';
import { IntegrationsContextStrip } from './IntegrationsContextStrip';
import { IntegrationsEmptyState } from './IntegrationsEmptyState';
import { IntegrationsFilterBar } from './IntegrationsFilterBar';
import { IntegrationsHeader } from './IntegrationsHeader';
import { IntegrationsSkeleton } from './IntegrationsSkeleton';
import { IntegrationsTable } from './IntegrationsTable';
import { getIntegrationsPageData } from './mockData';
import {
  type EnvironmentFilterOption,
  type IntegrationListRow,
  type IntegrationsViewState,
  type SortOption,
  type StatusFilterOption,
  type TemplateFilterOption,
} from './types';

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

export function IntegrationsPage({ viewState }: IntegrationsPageProps) {
  const [searchValue, setSearchValue] = useState('');
  const [status, setStatus] = useState<StatusFilterOption>('All');
  const [templateType, setTemplateType] = useState<TemplateFilterOption>('All');
  const [environment, setEnvironment] = useState<EnvironmentFilterOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('Recently Updated');
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  if (viewState === 'loading') {
    return (
      <div className="space-y-6">
        <IntegrationsHeader />
        <IntegrationsSkeleton />
      </div>
    );
  }

  const data = getIntegrationsPageData(viewState);
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
      {data.rows.length === 0 ? <IntegrationsEmptyState /> : <IntegrationsTable rows={filteredRows} />}
    </div>
  );
}