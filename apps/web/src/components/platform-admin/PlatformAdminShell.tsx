import Link from 'next/link';

const MODULES = [
  { label: 'Template Catalog', href: '/platform-admin/templates', enabled: true },
  { label: 'Visibility Rules', href: '', enabled: false },
  { label: 'Demo Profiles', href: '', enabled: false },
  { label: 'Tenant Controls', href: '', enabled: false },
  { label: 'Feature Flags', href: '', enabled: false },
] as const;

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-amber-300/70 bg-amber-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">Internal Only</p>
        <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-text-main">Platform Admin Console</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Internal governance console for template publication, classification, and visibility controls.
        </p>
      </header>

      <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Internal Modules</p>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Platform admin modules">
          {MODULES.map((module) =>
            module.enabled ? (
              <Link
                key={module.label}
                href={module.href}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/[0.05] px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.1]"
              >
                {module.label}
              </Link>
            ) : (
              <span
                key={module.label}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-medium text-text-muted/75"
              >
                {module.label} (soon)
              </span>
            ),
          )}
        </nav>
      </section>

      {children}
    </div>
  );
}
