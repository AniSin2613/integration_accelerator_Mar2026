'use client';

import Link from 'next/link';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface border-b border-border-soft sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden w-9 h-9 rounded-lg border border-border-soft text-text-muted hover:text-text-main hover:bg-slate-50 transition-colors flex items-center justify-center"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <Link href="/dashboard" className="flex items-center gap-2.5 text-text-main shrink-0">
          <div className="size-5 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                clipRule="evenodd"
                d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-[-0.015em]">Cogniviti Bridge</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border-soft text-[12px] text-text-muted font-medium">
          <span className="material-symbols-outlined text-[16px]">workspaces</span>
          Default Workspace
        </div>

        <div className="hidden xl:flex items-center h-9 w-[240px] rounded-lg border border-border-soft bg-background-light px-3 text-text-muted text-[13px]">
          <span className="material-symbols-outlined text-[18px] mr-2">search</span>
          Search workspace
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-border-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Dev</span>
        </div>

        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-text-muted transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="User menu"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
            AD
          </div>
          <span className="hidden sm:block text-[13px] font-medium text-text-main">Admin</span>
        </button>
      </div>
    </header>
  );
}
