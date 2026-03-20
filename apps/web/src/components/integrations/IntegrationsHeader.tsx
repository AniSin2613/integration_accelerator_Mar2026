import Link from 'next/link';

export function IntegrationsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Integrations</h1>
        <p className="text-sm sm:text-[15px] text-text-muted mt-2 max-w-[680px]">
          View and manage integrations in the current workspace
        </p>
      </div>

      <Link
        href="/templates"
        className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center shrink-0"
      >
        Create Integration
      </Link>
    </div>
  );
}