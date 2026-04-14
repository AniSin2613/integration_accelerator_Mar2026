'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { WorkspaceSelector } from './WorkspaceSelector';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<TopbarEnvironment>('Dev');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch user profile
  useEffect(() => {
    api.get<UserProfile>('/auth/me').then(setUser).catch(() => {});
  }, []);

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

  // ⌘K to open global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Even if the API call fails, clear cookies client-side
    }
    // Force a full reload to /login so middleware clears state
    window.location.href = '/login';
  };

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

        <WorkspaceSelector />

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden xl:flex items-center h-9 w-[260px] rounded-lg border border-border-soft bg-background-light px-3 text-text-muted text-[13px] gap-2 cursor-text hover:border-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">search</span>
          <span className="flex-1 min-w-0 text-left text-text-muted/60 truncate">Search integrations, connections...</span>
          <kbd className="shrink-0 rounded border border-border-soft bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted/60">⌘K</kbd>
        </button>
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

        <NotificationsDropdown />

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
              {user ? getInitials(user.name) : '··'}
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-text-main">{user?.name ?? 'User'}</span>
            <span className="material-symbols-outlined text-[14px] text-text-muted hidden sm:block">expand_more</span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-[200px] rounded-xl border border-border-soft bg-surface shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-soft bg-slate-50/50">
                <p className="text-[13px] font-semibold text-text-main">{user?.name ?? 'User'}</p>
                <p className="text-[11px] text-text-muted truncate">{user ? formatRole(user.role) : ''}</p>
              </div>
              <ul className="py-1">
                <li>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-text-main hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-muted">settings</span>
                    Settings
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {isSearchOpen && <GlobalSearchModal onClose={() => setIsSearchOpen(false)} />}
    </header>
  );
}
