import Link from 'next/link';

const ACTIONS = [
  { label: 'Create Integration', href: '/integrations', icon: 'add_circle' },
  { label: 'Add Connection', href: '/connections', icon: 'cable' },
  { label: 'Browse Templates', href: '/templates', icon: 'layers' },
  { label: 'Review Mappings', href: '/integrations', icon: 'schema' },
  { label: 'Open Monitoring', href: '/monitoring', icon: 'monitor_heart' },
] as const;

export function QuickActionsPanel() {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Quick Actions</h3>
      </div>

      <div className="p-4 space-y-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="w-full rounded-lg border border-border-soft bg-background-light px-3.5 py-3 text-sm font-medium text-text-main hover:bg-slate-50 transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted">{action.icon}</span>
              {action.label}
            </span>
            <span className="material-symbols-outlined text-[16px] text-text-muted">arrow_forward</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
