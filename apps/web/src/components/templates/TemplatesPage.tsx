'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { TemplateGroupSection } from './TemplateGroupSection';
import { api } from '@/lib/api-client';
import { TemplatesEmptyFilteredState } from './TemplatesEmptyFilteredState';
import { TemplatesFilterBar } from './TemplatesFilterBar';
import { TemplatesHeader } from './TemplatesHeader';
import { TemplatesNoTemplatesState } from './TemplatesNoTemplatesState';
import { TemplatesSkeleton } from './TemplatesSkeleton';
import {
  type TemplateCategoryFilter,
  type TemplateItem,
  type TemplateSortOption,
  type TemplateSourceFilter,
  type TemplateTargetFilter,
  type TemplateUseCaseFilter,
  type TemplatesViewState,
} from './types';

interface TemplatesPageProps {
  viewState: TemplatesViewState;
}

const SOURCE_OPTION_ORDER: Exclude<TemplateSourceFilter, 'All Sources'>[] = ['Coupa', 'REST', 'GEP', 'REST API', 'File', 'DB', 'S3'];
const TARGET_OPTION_ORDER: Exclude<TemplateTargetFilter, 'All Targets'>[] = [
  'SAP',
  'Coupa',
  'JSON File',
  'XML File',
  'REST',
  'Demo JSON',
  'Demo XML',
  'Dynamics',
  'ERP',
  'REST API',
  'File',
  'DB',
];
const USE_CASE_OPTION_ORDER: Exclude<TemplateUseCaseFilter, 'All Use Cases'>[] = [
  'Invoices',
  'Purchase Orders',
  'Vendor Sync',
  'Payments',
  'REST to REST',
  'REST to DB',
  'File to REST',
  'DB to REST',
];

function sortTemplates(templates: TemplateItem[], sortBy: TemplateSortOption): TemplateItem[] {
  const next = [...templates];

  if (sortBy === 'Name A-Z') {
    next.sort((left, right) => left.name.localeCompare(right.name));
    return next;
  }

  if (sortBy === 'Recently Updated') {
    next.sort((left, right) => left.updatedDaysAgo - right.updatedDaysAgo);
    return next;
  }

  if (sortBy === 'Most Used') {
    next.sort((left, right) => right.usageCount - left.usageCount);
    return next;
  }

  next.sort((left, right) => {
    if (left.group !== right.group) {
      return left.group === 'Prebuilt' ? -1 : 1;
    }

    return right.usageCount - left.usageCount;
  });
  return next;
}

export function TemplatesPage({ viewState }: TemplatesPageProps) {
  const [searchValue, setSearchValue] = useState('');
  const [category, setCategory] = useState<TemplateCategoryFilter>('All');
  const [source, setSource] = useState<TemplateSourceFilter>('All Sources');
  const [target, setTarget] = useState<TemplateTargetFilter>('All Targets');
  const [useCase, setUseCase] = useState<TemplateUseCaseFilter>('All Use Cases');
  const [sortBy, setSortBy] = useState<TemplateSortOption>('Recommended');
  const [apiTemplates, setApiTemplates] = useState<TemplateItem[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());

  // Fetch templates from API on mount
  useEffect(() => {
    let cancelled = false;
    api
      .get<any[]>('/templates')
      .then((rows) => {
        if (cancelled) return;
        const mapped: TemplateItem[] = rows.map((t) => {
          const latestVersion = t.versions?.[0];
          const isPrebuilt = t.class === 'CERTIFIED';
          const srcSystem = (t.sourceSystem ?? 'REST API') as TemplateItem['source'];
          const tgtSystem = (t.targetSystem ?? 'REST API') as TemplateItem['target'];
          const bo = (t.businessObject ?? 'API Payload').replace(/_/g, ' ');
          const useCaseLabel = bo.includes('INVOICE') ? 'Invoices'
            : bo.includes('PURCHASE_ORDER') || bo.includes('Purchase Order') ? 'Purchase Orders'
            : bo.includes('VENDOR') || bo.includes('SUPPLIER') ? 'Vendor Sync'
            : `${srcSystem} to ${tgtSystem}`;
          return {
            id: t.id,
            name: t.name,
            group: isPrebuilt ? 'Prebuilt' : 'Generic',
            categoryLabel: isPrebuilt ? 'Prebuilt Template' : 'Generic Template',
            templateTypeTag: isPrebuilt ? 'Prebuilt' : 'Generic',
            description: t.description ?? '',
            source: srcSystem,
            target: tgtSystem,
            useCase: useCaseLabel as TemplateItem['useCase'],
            objectType: bo,
            version: latestVersion?.version ?? 'v1.0',
            lastUpdated: latestVersion?.publishedAt
              ? new Date(latestVersion.publishedAt).toLocaleDateString()
              : 'Recently',
            updatedDaysAgo: latestVersion?.publishedAt
              ? Math.max(0, Math.floor((Date.now() - new Date(latestVersion.publishedAt).getTime()) / 86400000))
              : 0,
            usageCount: 0,
            isPublished: true,
            visibilityScope: 'global' as const,
            audienceTags: ['general' as const],
            allowedTenants: [],
            allowedDemoProfiles: ['generic_enterprise_demo' as const],
          };
        });
        setApiTemplates(mapped);
        setApiLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setApiTemplates([]);
          setApiLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Use API data
  const data = useMemo(() => {
    return {
      summary: {
        total: apiTemplates.length,
        prebuilt: apiTemplates.filter((t) => t.group === 'Prebuilt').length,
        generic: apiTemplates.filter((t) => t.group === 'Generic').length,
        recentlyUpdated: apiTemplates.filter((t) => t.updatedDaysAgo <= 7).length,
      },
      templates: apiTemplates,
    };
  }, [apiTemplates]);

  const categoryOptions = useMemo<TemplateCategoryFilter[]>(() => {
    const options: TemplateCategoryFilter[] = ['All'];
    const hasPrebuilt = data.templates.some((template) => template.group === 'Prebuilt');
    const hasGeneric = data.templates.some((template) => template.group === 'Generic');

    if (hasPrebuilt) {
      options.push('Prebuilt Templates');
    }

    if (hasGeneric) {
      options.push('Generic Templates');
    }

    return options;
  }, [data.templates]);

  const sourceOptions = useMemo<TemplateSourceFilter[]>(() => {
    const visibleSources = new Set(data.templates.map((template) => template.source));
    return ['All Sources', ...SOURCE_OPTION_ORDER.filter((sourceOption) => visibleSources.has(sourceOption))];
  }, [data.templates]);

  const targetOptions = useMemo<TemplateTargetFilter[]>(() => {
    const visibleTargets = new Set(data.templates.map((template) => template.target));
    return ['All Targets', ...TARGET_OPTION_ORDER.filter((targetOption) => visibleTargets.has(targetOption))];
  }, [data.templates]);

  const useCaseOptions = useMemo<TemplateUseCaseFilter[]>(() => {
    const visibleUseCases = new Set(data.templates.map((template) => template.useCase));
    return ['All Use Cases', ...USE_CASE_OPTION_ORDER.filter((useCaseOption) => visibleUseCases.has(useCaseOption))];
  }, [data.templates]);

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      setCategory('All');
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (!sourceOptions.includes(source)) {
      setSource('All Sources');
    }
  }, [source, sourceOptions]);

  useEffect(() => {
    if (!targetOptions.includes(target)) {
      setTarget('All Targets');
    }
  }, [target, targetOptions]);

  useEffect(() => {
    if (!useCaseOptions.includes(useCase)) {
      setUseCase('All Use Cases');
    }
  }, [useCase, useCaseOptions]);

  const filteredTemplates = sortTemplates(
    data.templates.filter((template) => {
      const matchesSearch =
        deferredSearchValue.length === 0 ||
        template.name.toLowerCase().includes(deferredSearchValue) ||
        template.description.toLowerCase().includes(deferredSearchValue) ||
        template.useCase.toLowerCase().includes(deferredSearchValue);

      const matchesCategory =
        category === 'All' ||
        (category === 'Prebuilt Templates' && template.group === 'Prebuilt') ||
        (category === 'Generic Templates' && template.group === 'Generic');

      const matchesSource = source === 'All Sources' || template.source === source;
      const matchesTarget = target === 'All Targets' || template.target === target;
      const matchesUseCase = useCase === 'All Use Cases' || template.useCase === useCase;

      return matchesSearch && matchesCategory && matchesSource && matchesTarget && matchesUseCase;
    }),
    sortBy,
  );

  const clearFilters = () => {
    setSearchValue('');
    setCategory('All');
    setSource('All Sources');
    setTarget('All Targets');
    setUseCase('All Use Cases');
    setSortBy('Recommended');
  };

  if (apiLoading || viewState === 'loading') {
    return (
      <div className="space-y-6">
        <TemplatesHeader />
        <TemplatesSkeleton />
      </div>
    );
  }

  const prebuiltTemplates = filteredTemplates.filter((template) => template.group === 'Prebuilt');
  const genericTemplates = filteredTemplates.filter((template) => template.group === 'Generic');
  const hasNoTemplates = data.templates.length === 0 || viewState === 'no-templates';
  const isFilteredEmpty = !hasNoTemplates && (viewState === 'empty' || filteredTemplates.length === 0);

  return (
    <div className="space-y-6">
      <TemplatesHeader />

      <TemplatesFilterBar
        searchValue={searchValue}
        category={category}
        categoryOptions={categoryOptions}
        source={source}
        sourceOptions={sourceOptions}
        target={target}
        targetOptions={targetOptions}
        useCase={useCase}
        useCaseOptions={useCaseOptions}
        sortBy={sortBy}
        onSearchChange={setSearchValue}
        onCategoryChange={setCategory}
        onSourceChange={setSource}
        onTargetChange={setTarget}
        onUseCaseChange={setUseCase}
        onSortChange={setSortBy}
      />

      {hasNoTemplates ? (
        <TemplatesNoTemplatesState />
      ) : isFilteredEmpty ? (
        <TemplatesEmptyFilteredState onClearFilters={clearFilters} />
      ) : (
        <div className="space-y-6">
          <TemplateGroupSection
            title="Prebuilt Templates"
            subtitle="Ready-made integration patterns with built-in mappings and workflow defaults."
            templates={prebuiltTemplates}
          />
          <TemplateGroupSection
            title="Generic Templates"
            subtitle="Generic technical patterns that can be adapted for custom integration needs."
            templates={genericTemplates}
          />
        </div>
      )}
    </div>
  );
}
