'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';

interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
}

export function WorkspaceSelector() {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selected, setSelected] = useState<WorkspaceOption | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    api
      .get<any[]>('/tenants')
      .then((tenants) => {
        const allWorkspaces: WorkspaceOption[] = [];
        for (const tenant of tenants) {
          if (Array.isArray(tenant.workspaces)) {
            for (const ws of tenant.workspaces) {
              allWorkspaces.push({ id: ws.id, name: ws.name, slug: ws.slug });
            }
          }
        }
        setWorkspaces(allWorkspaces);
        if (allWorkspaces.length > 0) {
          setSelected(allWorkspaces[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setWorkspaces([]);
        setLoading(false);
      });
  }, []);

  const handleSelect = (ws: WorkspaceOption) => {
    setSelected(ws);
    setOpen(false);
    // Store in localStorage so other pages can reference it
    try { localStorage.setItem('cb_workspace_slug', ws.slug); } catch {}
  };

  return (
    <div className="relative hidden md:block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border-soft text-[12px] text-text-muted font-medium transition-colors hover:bg-slate-100 hover:border-slate-300"
        aria-label="Switch workspace"
        aria-haspopup="listbox"
      >
        <span className="material-symbols-outlined text-[16px]">workspaces</span>
        {loading ? 'Loading…' : (selected?.name ?? 'No Workspace')}
        <span className="material-symbols-outlined text-[14px] opacity-50">expand_more</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[240px] rounded-xl border border-border-soft bg-surface shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border-soft bg-slate-50/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Workspaces</p>
          </div>
          {workspaces.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-muted">No workspaces found</div>
          ) : (
            <ul className="py-1 max-h-[240px] overflow-y-auto">
              {workspaces.map((ws) => (
                <li key={ws.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(ws)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors ${
                      selected?.id === ws.id
                        ? 'bg-primary/5 text-primary font-semibold'
                        : 'text-text-main hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {selected?.id === ws.id ? 'check_circle' : 'circle'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{ws.name}</p>
                      <p className="text-[10px] text-text-muted font-mono">{ws.slug}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
