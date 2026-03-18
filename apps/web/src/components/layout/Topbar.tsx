'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/templates': 'Template Catalog',
  '/integrations': 'Integrations',
  '/connections': 'Connections',
  '/monitoring': 'Monitoring',
};

function getTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes('/designer')) return 'Workflow Designer';
  if (pathname.includes('/mappings')) return 'Mapping Review';
  if (pathname.includes('/releases')) return 'Releases';
  if (pathname.includes('/integrations/')) return 'Integration';
  return 'Cogniviti Bridge';
}

export function Topbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface border-b border-border-soft sticky top-0 z-20 shrink-0">
      <h1 className="text-[15px] font-semibold text-text-main">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Environment badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-border-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Prod</span>
        </div>
        {/* Notifications stub */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-text-muted transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
      </div>
    </header>
  );
}
