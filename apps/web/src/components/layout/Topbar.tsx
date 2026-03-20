'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface TopbarProps {
  onOpenSidebar: () => void;
}

const ENVIRONMENTS = ['Dev', 'Test', 'Prod'] as const;
type TopbarEnvironment = (typeof ENVIRONMENTS)[number];

function isTopbarEnvironment(value: string | null): value is TopbarEnvironment {
  return value === 'Dev' || value === 'Test' || value === 'Prod';
}

const ENV_SELECT_CLASS: Record<TopbarEnvironment, string> = {
  Dev: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300',
  Test: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
  Prod: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
};

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const [isSearchHintStatic, setIsSearchHintStatic] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<TopbarEnvironment>('Dev');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const syncEnvironmentFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const env = params.get('env');
      setSelectedEnvironment(isTopbarEnvironment(env) ? env : 'Dev');
    };

    syncEnvironmentFromUrl();
    window.addEventListener('popstate', syncEnvironmentFromUrl);
    return () => window.removeEventListener('popstate', syncEnvironmentFromUrl);
  }, []);

  const handleEnvironmentChange = (nextEnvironment: TopbarEnvironment) => {
    setSelectedEnvironment(nextEnvironment);

    const params = new URLSearchParams(window.location.search);
    params.set('env', nextEnvironment);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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

        <button
          type="button"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border-soft text-[12px] text-text-muted font-medium transition-colors hover:bg-slate-100 hover:border-slate-300"
          aria-label="Switch workspace"
          aria-haspopup="listbox"
        >
          <span className="material-symbols-outlined text-[16px]">workspaces</span>
          Default Workspace
          <span className="material-symbols-outlined text-[14px] opacity-50">expand_more</span>
        </button>

        <div
          role="search"
          aria-label="Global search"
          className="hidden xl:flex items-center h-9 w-[260px] rounded-lg border border-border-soft bg-background-light px-3 text-text-muted text-[13px] gap-2 cursor-text hover:border-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">search</span>
          <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap">
            <span
              className={`global-search-marquee inline-flex min-w-max text-text-muted/60 ${isSearchHintStatic ? 'is-static' : ''}`}
              onAnimationEnd={() => setIsSearchHintStatic(true)}
            >
              Search workspaces, integrations, connections...
            </span>
          </div>
          <kbd className="shrink-0 rounded border border-border-soft bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted/60">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex items-center">
          <select
            value={selectedEnvironment}
            onChange={(e) => handleEnvironmentChange(e.target.value as TopbarEnvironment)}
            aria-label="Select environment"
            className={`h-8 cursor-pointer appearance-none rounded-full border pl-2.5 pr-6 text-[11px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 ${ENV_SELECT_CLASS[selectedEnvironment]}`}
          >
            {ENVIRONMENTS.map((environment) => (
              <option key={environment} value={environment}>
                {environment}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 material-symbols-outlined text-[13px] text-current"
            aria-hidden
          >
            expand_more
          </span>
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

      <style jsx>{`
        @keyframes globalSearchMarquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-42%);
          }
        }

        .global-search-marquee {
          animation: globalSearchMarquee 8s linear 1;
          will-change: transform;
        }

        .global-search-marquee.is-static {
          animation: none;
          transform: translateX(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .global-search-marquee {
            animation: none;
            transform: translateX(0);
          }
        }
      `}</style>
    </header>
  );
}
