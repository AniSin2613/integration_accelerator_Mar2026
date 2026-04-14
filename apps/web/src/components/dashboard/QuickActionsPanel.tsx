import Link from 'next/link';

const ACTIONS = [
  { label: 'Create Integration', href: '/integrations', icon: 'add_circle' },
  { label: 'Test Connection', href: '/connections', icon: 'cable' },
  { label: 'Open Builder', href: '/integrations', icon: 'build' },
  { label: 'Submit Release', href: '/integrations', icon: 'publish' },
  { label: 'View Monitoring', href: '/monitoring', icon: 'monitor_heart' },
] as const;

export function QuickActionsPanel() {
  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5 h-full flex flex-col">
      <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">Quick Actions</h3>
      <div className="flex flex-wrap gap-2 flex-1 content-start">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[13px] font-medium text-text-main hover:bg-slate-50 hover:border-primary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-text-muted">{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
