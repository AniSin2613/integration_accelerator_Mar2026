import Link from 'next/link';

const ACTIONS = [
  { label: 'Create Integration', href: '/templates', icon: 'add_circle', primary: true },
  { label: 'Test Connection', href: '/connections', icon: 'cable', primary: false },
  { label: 'Submit Release', href: '/integrations', icon: 'publish', primary: false },
  { label: 'View Monitoring', href: '/monitoring', icon: 'monitor_heart', primary: false },
] as const;

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Dashboard</h1>
        <p className="text-sm sm:text-[15px] text-text-muted mt-1">
          Overview of integrations, connections, and operational health
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              a.primary
                ? 'border-primary bg-primary text-white hover:bg-primary/90'
                : 'border-border-soft bg-surface text-text-main hover:bg-slate-50 hover:border-primary/30'
            }`}
          >
            <span className={`material-symbols-outlined text-[14px] ${a.primary ? 'text-white/80' : 'text-text-muted'}`}>{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
