import Link from 'next/link';

export default function BlankCreateEntryRoute() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">
          Blank Create Entry
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Start with a blank integration. No template is preloaded, so you will define each part of the flow manually.
        </p>
      </header>

      <section className="rounded-xl border border-border-soft bg-surface p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted/80">Blank Starting Point</p>
        <h2 className="mt-1 text-xl font-semibold text-text-main">Configure from scratch</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          This path starts with no predefined connectors, mappings, or workflow structure.
        </p>

        <div className="mt-4 rounded-lg border border-border-soft bg-surface p-4">
          <p className="text-sm font-semibold text-text-main">What you will configure manually</p>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            <li>- Source system and connection details</li>
            <li>- Target system and destination contract</li>
            <li>- Workflow logic, mapping rules, and validation behavior</li>
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/integrations/new-draft/builder"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Start Blank Setup
          </Link>
          <Link
            href="/templates"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
          >
            Browse Templates
          </Link>
        </div>
      </section>
    </div>
  );
}
