'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  environments?: { id: string; type: string; name: string }[];
}

interface ConnectionSummary {
  total: number;
  healthy: number;
  failed: number;
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [connections, setConnections] = useState<ConnectionSummary>({ total: 0, healthy: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [camelHealth, setCamelHealth] = useState<'healthy' | 'unreachable' | 'checking'>('checking');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get<any[]>('/tenants').catch(() => []),
      api.get<any[]>('/connections?slug=procurement').catch(() => []),
    ]).then(([tenants, conns]) => {
      if (cancelled) return;

      // Resolve workspace from first tenant
      if (tenants.length > 0 && tenants[0].workspaces?.length > 0) {
        const ws = tenants[0].workspaces[0];
        setWorkspace({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          environments: ws.environments,
        });
      }

      // Connection summary
      const healthy = conns.filter((c: any) => c.health === 'healthy').length;
      const failed = conns.filter((c: any) => c.health === 'failed').length;
      setConnections({ total: conns.length, healthy, failed });

      setLoading(false);
    });

    // Check Camel runner health
    fetch('/api/health')
      .then((r) => {
        if (!cancelled) setCamelHealth(r.ok ? 'healthy' : 'unreachable');
      })
      .catch(() => {
        if (!cancelled) setCamelHealth('unreachable');
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Settings</h1>
        <p className="text-sm sm:text-[15px] text-text-muted mt-2 max-w-[760px]">
          Workspace configuration, environment management, and system health for Cogniviti Bridge
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border-soft bg-surface p-6">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-64 rounded bg-slate-200/70" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Workspace Info */}
          <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-soft bg-slate-50/50">
              <h2 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">workspaces</span>
                Workspace
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">Workspace Name</p>
                  <p className="text-[15px] font-semibold text-text-main mt-1">{workspace?.name ?? 'Default Workspace'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">Slug</p>
                  <p className="text-[15px] font-mono text-text-main mt-1">{workspace?.slug ?? 'procurement'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">Workspace ID</p>
                  <p className="text-[13px] font-mono text-text-muted mt-1 truncate">{workspace?.id ?? '--'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Environments */}
          <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-soft bg-slate-50/50">
              <h2 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-accent-blue">dns</span>
                Environments
              </h2>
            </div>
            <div className="p-6">
              {workspace?.environments && workspace.environments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {workspace.environments.map((env) => (
                    <div key={env.id} className="rounded-lg border border-border-soft bg-background-light p-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          env.type === 'PROD' ? 'bg-emerald-500' :
                          env.type === 'TEST' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <p className="text-[14px] font-semibold text-text-main">{env.name || env.type}</p>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1 font-mono">{env.type}</p>
                      <p className="text-[10px] text-text-muted/60 mt-0.5 truncate">{env.id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Environments are auto-created when a workspace is provisioned (Dev, Test, Prod).</p>
              )}
            </div>
          </section>

          {/* Connections Summary */}
          <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-soft bg-slate-50/50">
              <h2 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-warning">cable</span>
                Connections
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border-soft bg-background-light p-4 text-center">
                  <p className="text-[26px] font-bold text-text-main tabular-nums">{connections.total}</p>
                  <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wide mt-0.5">Total</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                  <p className="text-[26px] font-bold text-emerald-700 tabular-nums">{connections.healthy}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide mt-0.5">Healthy</p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-center">
                  <p className="text-[26px] font-bold text-rose-700 tabular-nums">{connections.failed}</p>
                  <p className="text-[11px] text-rose-600 font-semibold uppercase tracking-wide mt-0.5">Failed</p>
                </div>
              </div>
            </div>
          </section>

          {/* System Health */}
          <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-soft bg-slate-50/50">
              <h2 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-success">monitor_heart</span>
                System Health
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border-soft bg-background-light p-4 flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${camelHealth === 'healthy' ? 'bg-emerald-500' : camelHealth === 'unreachable' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                  <div>
                    <p className="text-[13px] font-semibold text-text-main">API Server</p>
                    <p className="text-[11px] text-text-muted">{camelHealth === 'healthy' ? 'Connected' : camelHealth === 'unreachable' ? 'Unreachable' : 'Checking...'}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border-soft bg-background-light p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-accent-blue">storage</span>
                  <div>
                    <p className="text-[13px] font-semibold text-text-main">Database</p>
                    <p className="text-[11px] text-text-muted">PostgreSQL via Prisma</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border-soft bg-background-light p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-warning">route</span>
                  <div>
                    <p className="text-[13px] font-semibold text-text-main">Camel Runner</p>
                    <p className="text-[11px] text-text-muted">Apache Camel 4.x via JBang</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-soft bg-slate-50/50">
              <h2 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-text-muted">info</span>
                About Cogniviti Bridge
              </h2>
            </div>
            <div className="p-6 space-y-2 text-sm text-text-muted">
              <p><strong className="text-text-main">Cogniviti Bridge</strong> is an opinionated integration accelerator built on Apache Camel.</p>
              <p>It provides a UI layer for designing, testing, deploying, and monitoring integrations across enterprise systems.</p>
              <p className="text-[12px] text-text-muted/60 mt-3">
                Apache Camel 4.x LTS • Next.js 14 • NestJS • PostgreSQL • JBang Runner
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
