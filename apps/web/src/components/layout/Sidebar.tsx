'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/templates', icon: 'layers', label: 'Templates' },
  { href: '/integrations', icon: 'hub', label: 'Integrations' },
  { href: '/connections', icon: 'cable', label: 'Connections' },
  { href: '/monitoring', icon: 'monitor_heart', label: 'Monitoring' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[220px] flex-none flex-col bg-surface border-r border-border-soft h-screen sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-soft shrink-0">
        <div className="w-7 h-7 text-primary">
          {/* Cogniviti diamond logomark */}
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0)">
              <path
                clipRule="evenodd"
                d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </g>
            <defs>
              <clipPath id="clip0">
                <rect fill="white" height="48" width="48" />
              </clipPath>
            </defs>
          </svg>
        </div>
        <span className="text-text-main text-[15px] font-bold tracking-tight leading-tight">
          Cogniviti Bridge
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/8 text-primary'
                  : 'text-text-muted hover:bg-gray-50 hover:text-text-main'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border-soft shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            AA
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-text-main truncate">Alex Admin</span>
            <span className="text-[11px] text-text-muted truncate">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
