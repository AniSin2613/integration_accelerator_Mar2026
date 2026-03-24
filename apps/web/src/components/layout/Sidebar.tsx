'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/integrations', icon: 'hub', label: 'Integrations' },
  { href: '/templates', icon: 'layers', label: 'Templates' },
  { href: '/connections', icon: 'cable', label: 'Connections' },
  { href: '/monitoring', icon: 'monitor_heart', label: 'Monitoring' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
] as const;

const FOOTER_LINKS = [
  { label: 'Documentation', icon: 'menu_book', href: '/docs' },
  { label: 'Getting Started', icon: 'rocket_launch', href: '/docs/getting-started' },
  { label: 'Support / Contact', icon: 'support_agent', href: '/support' },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto scrollbar-thin">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-muted hover:bg-slate-50 hover:text-text-main border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="p-3 border-t border-border-soft shrink-0 space-y-0.5">
      <p className="px-3 py-2 text-[11px] uppercase tracking-wide font-semibold text-text-muted/70">
        Help &amp; Resources
      </p>
      {FOOTER_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-text-muted hover:bg-slate-50 hover:text-text-main transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:flex w-[240px] flex-none flex-col bg-surface border-r border-border-soft h-[calc(100vh-64px)] sticky top-16 z-20">
        <div className="px-4 py-4 border-b border-border-soft">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-text-muted">Workspace Navigation</p>
        </div>
        <SidebarNav pathname={pathname} onNavigate={() => {}} />
        <SidebarFooter />
      </aside>

      <div className={`lg:hidden fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-slate-900/25 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-label="Close navigation"
        />
        <aside className={`absolute top-0 left-0 h-full w-[280px] bg-surface border-r border-border-soft shadow-floating transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 px-4 border-b border-border-soft flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text-main">Navigation</p>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-border-soft text-text-muted hover:bg-slate-50"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <SidebarNav pathname={pathname} onNavigate={onClose} />
          <SidebarFooter onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}

