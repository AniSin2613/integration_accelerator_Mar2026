import { FilterBarSection, FilterBarSearch, FilterBarSelect } from '../ui/FilterBar';
import {
  ENVIRONMENT_FILTER_OPTIONS,
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TEMPLATE_FILTER_OPTIONS,
  type EnvironmentFilterOption,
  type SortOption,
  type StatusFilterOption,
  type TemplateFilterOption,
} from './types';

interface IntegrationsFilterBarProps {
  searchValue: string;
  status: StatusFilterOption;
  templateType: TemplateFilterOption;
  environment: EnvironmentFilterOption;
  sortBy: SortOption;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilterOption) => void;
  onTemplateTypeChange: (value: TemplateFilterOption) => void;
  onEnvironmentChange: (value: EnvironmentFilterOption) => void;
  onSortChange: (value: SortOption) => void;
}

export function IntegrationsFilterBar({
  searchValue,
  status,
  templateType,
  environment,
  sortBy,
  disabled = false,
  onSearchChange,
  onStatusChange,
  onTemplateTypeChange,
  onEnvironmentChange,
  onSortChange,
}: IntegrationsFilterBarProps) {
  return (
    <FilterBarSection
      disabled={disabled}
      disabledHint="Filters become available once integrations are added to this workspace."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <FilterBarSearch value={searchValue} placeholder="Search integrations" disabled={disabled} onChange={onSearchChange} />
        <FilterBarSelect value={status} options={STATUS_FILTER_OPTIONS} ariaLabel="Status filter" disabled={disabled} onChange={onStatusChange} />
        <FilterBarSelect value={templateType} options={TEMPLATE_FILTER_OPTIONS} ariaLabel="Template type filter" disabled={disabled} onChange={onTemplateTypeChange} />
        <FilterBarSelect value={environment} options={ENVIRONMENT_FILTER_OPTIONS} ariaLabel="Environment filter" disabled={disabled} onChange={onEnvironmentChange} />
        <FilterBarSelect value={sortBy} options={SORT_OPTIONS} ariaLabel="Sort integrations" disabled={disabled} onChange={onSortChange} />
      </div>
    </FilterBarSection>
  );
}