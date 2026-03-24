import Link from 'next/link';

interface TemplatesEmptyFilteredStateProps {
  onClearFilters: () => void;
}

export function TemplatesEmptyFilteredState({ onClearFilters }: TemplatesEmptyFilteredStateProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface px-6 py-10 text-center shadow-soft">
      <p className="text-[17px] font-semibold text-text-main">No templates found</p>
      <p className="mt-1.5 text-sm text-text-muted">
        Try adjusting your filters or search terms to find a matching template.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
        >
          Clear Filters
        </button>
        <Link
          href="/integrations/new/blank"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Create Blank Integration
        </Link>
      </div>
    </section>
  );
}
