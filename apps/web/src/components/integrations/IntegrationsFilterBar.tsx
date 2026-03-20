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

const CONTROL_CLASSES =
  'h-10 w-full rounded-lg border border-border-soft bg-surface px-3 text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

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
    <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <label className="relative block md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search integrations</span>
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">
            search
          </span>
          <input
            type="search"
            value={searchValue}
            disabled={disabled}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search integrations"
            className={`${CONTROL_CLASSES} pl-10`}
          />
        </label>

        <label className="block">
          <span className="sr-only">Status filter</span>
          <select
            value={status}
            disabled={disabled}
            onChange={(event) => onStatusChange(event.target.value as StatusFilterOption)}
            className={CONTROL_CLASSES}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Template type filter</span>
          <select
            value={templateType}
            disabled={disabled}
            onChange={(event) => onTemplateTypeChange(event.target.value as TemplateFilterOption)}
            className={CONTROL_CLASSES}
          >
            {TEMPLATE_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Environment filter</span>
          <select
            value={environment}
            disabled={disabled}
            onChange={(event) => onEnvironmentChange(event.target.value as EnvironmentFilterOption)}
            className={CONTROL_CLASSES}
          >
            {ENVIRONMENT_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Sort integrations</span>
          <select
            value={sortBy}
            disabled={disabled}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className={CONTROL_CLASSES}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {disabled && (
        <p className="mt-3 text-[12px] text-text-muted/60">
          Filters become available once integrations are added to this workspace.
        </p>
      )}
    </section>
  );
}