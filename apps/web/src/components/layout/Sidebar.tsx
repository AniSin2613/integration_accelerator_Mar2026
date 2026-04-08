'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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

function SidebarNav({ pathname, onNavigate, expanded }: { pathname: string; onNavigate: () => void; expanded: boolean }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto scrollbar-thin">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center rounded-lg text-sm font-medium transition-all duration-300 ${
              expanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'
            } ${
              isActive
                ? 'bg-primary text-white border border-primary/60 shadow-[0_0_16px_rgba(191,45,66,0.35)]'
                : 'text-slate-200 hover:bg-[#0F172A]/85 hover:text-white border border-transparent hover:border-slate-600/60'
            }`}
            title={!expanded ? item.label : undefined}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
            {expanded && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate, expanded }: { onNavigate?: () => void; expanded: boolean }) {
  return (
    <div className="p-3 border-t border-slate-600/60 shrink-0 space-y-0.5">
      {expanded && (
        <p className="px-3 py-2 text-[11px] uppercase tracking-wide font-semibold text-slate-400">
          Help &amp; Resources
        </p>
      )}
      {FOOTER_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          onClick={onNavigate}
          className={`flex items-center rounded-lg text-[13px] text-slate-300 hover:bg-[#0F172A]/85 hover:text-white hover:border-slate-600/60 border border-transparent transition-all duration-300 ${
            expanded ? 'gap-3 px-3 py-2' : 'justify-center py-2'
          }`}
          title={!expanded ? link.label : undefined}
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">{link.icon}</span>
          {expanded && <span className="truncate">{link.label}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden lg:flex w-auto flex-none flex-col bg-[#0F172A] border-r border-slate-700 h-[calc(100vh-64px)] sticky top-16 z-20 shadow-[2px_0_12px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out"
        style={{ width: expanded ? '240px' : '64px' }}
      >
        {/* Header with Collapse Button */}
        <div className={`px-3 py-3 border-b border-slate-700 flex items-center shrink-0 ${expanded ? 'justify-between' : 'justify-center'}`}>
          {expanded && (
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
              Workspace
            </p>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-600 bg-[#0F172A]/90 text-slate-300 hover:bg-[#0F172A]/75 hover:text-white hover:border-slate-500 transition-all duration-300"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span 
              className="material-symbols-outlined text-[18px] transition-transform duration-300 ease-out"
              style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              chevron_left
            </span>
          </button>
        </div>

        {/* Navigation */}
        <SidebarNav pathname={pathname} onNavigate={() => {}} expanded={expanded} />

        {/* Footer */}
        <SidebarFooter expanded={expanded} />
      </aside>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-[#0F172A]/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-label="Close navigation"
        />
        <aside className={`absolute top-0 left-0 h-full w-[280px] bg-[#0F172A] border-r border-slate-700 shadow-[2px_0_12px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 px-4 border-b border-slate-700 flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">Navigation</p>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-slate-600 bg-[#0F172A]/90 text-slate-300 hover:bg-[#0F172A]/75 hover:text-white transition-all duration-300"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <SidebarNav pathname={pathname} onNavigate={onClose} expanded={true} />
          <SidebarFooter onNavigate={onClose} expanded={true} />
        </aside>
      </div>
    </>
  );
}

