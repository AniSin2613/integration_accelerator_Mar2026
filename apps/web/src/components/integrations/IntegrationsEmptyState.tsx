import Link from 'next/link';

function SourceToTargetIcon() {
  return (
    <svg
      viewBox="0 0 88 32"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-[88px] text-text-muted"
      aria-hidden="true"
    >
      {/* Source block */}
      <rect x="0.75" y="6.75" width="24.5" height="18.5" rx="4.25" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="6" y1="13" x2="20" y2="13" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="17" x2="15" y2="17" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      {/* Connector arrow */}
      <line x1="26" y1="16" x2="60" y2="16" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M57 12.5L61.5 16L57 19.5" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Target block */}
      <rect x="62.75" y="6.75" width="24.5" height="18.5" rx="4.25" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="68" y1="13" x2="82" y2="13" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="68" y1="17" x2="77" y2="17" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IntegrationsEmptyState() {
  return (
    <section className="rounded-xl border border-border-soft bg-surface px-6 py-10 text-center shadow-soft sm:px-8">
      <div className="mx-auto max-w-[680px]">
        <div className="mx-auto flex items-center justify-center">
          <SourceToTargetIcon />
        </div>
        <h2 className="mt-5 text-[22px] font-semibold text-text-main">No integrations created yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted/50">
          Start by selecting a template, configuring a connection, or creating your first integration for this workspace.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/templates"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Create Integration
          </Link>
          <Link
            href="/connections"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border-soft px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
          >
            Add Connection
          </Link>
          <Link
            href="/templates"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border-soft px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
          >
            Browse Templates
          </Link>
        </div>
        <p className="mt-4 text-[13px] text-text-muted/50">
          Integrations created in this workspace will appear here with status, environment, and last activity.
        </p>
      </div>
    </section>
  );
}