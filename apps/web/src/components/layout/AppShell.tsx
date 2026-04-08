'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ErrorBoundary } from '../ErrorBoundary';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isStudioRoute = /^\/integrations\/[^/]+\/mapping$/.test(pathname);

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0">
        {!isStudioRoute && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={`flex-1 min-w-0 overflow-auto bg-background-light ${isStudioRoute ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`} style={{ boxShadow: 'inset 2px 0 8px -4px rgba(15,23,42,0.08)' }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
