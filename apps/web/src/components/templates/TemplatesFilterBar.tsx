import { FilterBarSection, FilterBarSearch, FilterBarSelect } from '../ui/FilterBar';
import {
  type TemplateCategoryFilter,
  type TemplateSortOption,
  type TemplateSourceFilter,
  type TemplateTargetFilter,
  type TemplateUseCaseFilter,
} from './types';

interface TemplatesFilterBarProps {
  searchValue: string;
  category: TemplateCategoryFilter;
  categoryOptions: TemplateCategoryFilter[];
  source: TemplateSourceFilter;
  sourceOptions: TemplateSourceFilter[];
  target: TemplateTargetFilter;
  targetOptions: TemplateTargetFilter[];
  useCase: TemplateUseCaseFilter;
  useCaseOptions: TemplateUseCaseFilter[];
  sortBy: TemplateSortOption;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: TemplateCategoryFilter) => void;
  onSourceChange: (value: TemplateSourceFilter) => void;
  onTargetChange: (value: TemplateTargetFilter) => void;
  onUseCaseChange: (value: TemplateUseCaseFilter) => void;
  onSortChange: (value: TemplateSortOption) => void;
}

const SORT_OPTIONS: TemplateSortOption[] = ['Recommended', 'Recently Updated', 'Name A-Z', 'Most Used'];

export function TemplatesFilterBar({
  searchValue,
  category,
  categoryOptions,
  source,
  sourceOptions,
  target,
  targetOptions,
  useCase,
  useCaseOptions,
  sortBy,
  onSearchChange,
  onCategoryChange,
  onSourceChange,
  onTargetChange,
  onUseCaseChange,
  onSortChange,
}: TemplatesFilterBarProps) {
  return (
    <FilterBarSection>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
        <FilterBarSearch value={searchValue} placeholder="Search templates" onChange={onSearchChange} />
        <FilterBarSelect value={category} options={categoryOptions} ariaLabel="Filter by category" onChange={onCategoryChange} />
        <FilterBarSelect value={source} options={sourceOptions} ariaLabel="Filter by source" onChange={onSourceChange} />
        <FilterBarSelect value={target} options={targetOptions} ariaLabel="Filter by target" onChange={onTargetChange} />
        <FilterBarSelect value={useCase} options={useCaseOptions} ariaLabel="Filter by use case" onChange={onUseCaseChange} />
        <FilterBarSelect value={sortBy} options={SORT_OPTIONS} ariaLabel="Sort templates" onChange={onSortChange} />
      </div>
    </FilterBarSection>
  );
}
