import Link from 'next/link';

// Dev state switching: append ?view=loading|empty|demo to the URL manually in development
export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Dashboard</h1>
        <p className="text-sm sm:text-[15px] text-text-muted mt-2 max-w-[760px]">
          Overview of integrations, releases, monitoring, and operational health for this workspace
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/integrations"
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center"
        >
          Create Integration
        </Link>
        <Link
          href="/monitoring"
          className="h-10 px-4 rounded-lg border border-border-soft bg-surface text-text-main text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center"
        >
          View Monitoring
        </Link>
      </div>
    </div>
  );
}
