import { FilterBarSection, FilterBarSearch, FilterBarSelect } from '../ui/FilterBar';
import {
  CONNECTION_FAMILY_FILTER_OPTIONS,
  CONNECTION_SORT_OPTIONS,
  CONNECTION_STATUS_FILTER_OPTIONS,
  type ConnectionFamilyFilterOption,
  type ConnectionSortOption,
  type ConnectionStatusFilterOption,
} from './types';

interface ConnectionsFilterBarProps {
  searchValue: string;
  family: ConnectionFamilyFilterOption;
  status: ConnectionStatusFilterOption;
  sortBy: ConnectionSortOption;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onFamilyChange: (value: ConnectionFamilyFilterOption) => void;
  onStatusChange: (value: ConnectionStatusFilterOption) => void;
  onSortChange: (value: ConnectionSortOption) => void;
}

export function ConnectionsFilterBar({
  searchValue,
  family,
  status,
  sortBy,
  disabled = false,
  onSearchChange,
  onFamilyChange,
  onStatusChange,
  onSortChange,
}: ConnectionsFilterBarProps) {
  return (
    <FilterBarSection
      disabled={disabled}
      disabledHint="Filters become available once connections are added to this workspace."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <FilterBarSearch value={searchValue} placeholder="Search connections" disabled={disabled} onChange={onSearchChange} />
        <FilterBarSelect value={family} options={CONNECTION_FAMILY_FILTER_OPTIONS} ariaLabel="Connection family filter" disabled={disabled} onChange={onFamilyChange} />
        <FilterBarSelect value={status} options={CONNECTION_STATUS_FILTER_OPTIONS} ariaLabel="Status filter" disabled={disabled} onChange={onStatusChange} />
        <FilterBarSelect value={sortBy} options={CONNECTION_SORT_OPTIONS} ariaLabel="Sort connections" disabled={disabled} onChange={onSortChange} />
      </div>
    </FilterBarSection>
  );
}
