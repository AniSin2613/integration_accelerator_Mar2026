import Link from 'next/link';

export function TemplatesHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Templates</h1>
        <p className="mt-2 text-sm text-text-muted max-w-3xl">
          Browse prebuilt and generic templates to accelerate new integrations in this workspace
        </p>
      </div>

      <Link
        href="/integrations/new/blank"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border-soft bg-surface px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
      >
        Create Blank Integration
      </Link>
    </div>
  );
}
