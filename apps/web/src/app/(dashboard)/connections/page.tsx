'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface ConnectionDefinition {
  id: string;
  name: string;
  family: string;
  baseUrl: string | null;
  description: string | null;
  envBindings?: { id: string; environment: { name: string; type: string } }[];
}

const familyIcon: Record<string, string> = {
  REST_OPENAPI: 'api',
  SFTP_FILE: 'folder_zip',
  JDBC_SQL: 'storage',
  S3: 'cloud',
  WEBHOOK: 'webhook',
  SCHEDULER: 'schedule',
};

const familyLabel: Record<string, string> = {
  REST_OPENAPI: 'REST / OpenAPI',
  SFTP_FILE: 'SFTP / File',
  JDBC_SQL: 'JDBC / SQL',
  S3: 'S3',
  WEBHOOK: 'Webhook',
  SCHEDULER: 'Scheduler',
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, 'testing' | 'ok' | 'fail'>>({});

  useEffect(() => {
    api
      .get<ConnectionDefinition[]>('/connections?slug=procurement')
      .catch(() => [])
      .then((d) => {
        setConnections(d ?? []);
        setLoading(false);
      });
  }, []);

  const handleTest = async (id: string) => {
    setFeedback((f) => ({ ...f, [id]: 'testing' }));
    try {
      await api.post(`/connections/${id}/test`, {});
      setFeedback((f) => ({ ...f, [id]: 'ok' }));
    } catch {
      setFeedback((f) => ({ ...f, [id]: 'fail' }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-text-muted">{connections.length} connection definitions</h2>
        <button className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Connection
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-text-muted text-sm">Loading connections…</div>
      )}

      {!loading && connections.length === 0 && (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-surface rounded-xl border border-border-soft">
          <span className="material-symbols-outlined text-[48px] text-text-muted/40">link_off</span>
          <p className="text-text-muted text-sm">No connections configured yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {connections.map((conn) => {
          const icon = familyIcon[conn.family] ?? 'api';
          const fb = feedback[conn.id];
          return (
            <div
              key={conn.id}
              className="bg-surface rounded-xl border border-border-soft shadow-soft p-5 flex items-start gap-4 hover:border-primary/20 transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px] text-accent-blue">{icon}</span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-main text-sm">{conn.name}</span>
                  <Badge variant="neutral" label={familyLabel[conn.family] ?? conn.family} />
                </div>
                {conn.baseUrl && (
                  <p className="text-xs text-text-muted mt-0.5 font-mono truncate">{conn.baseUrl}</p>
                )}
                {conn.description && (
                  <p className="text-xs text-text-muted mt-1">{conn.description}</p>
                )}

                {/* Env bindings */}
                {conn.envBindings && conn.envBindings.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {conn.envBindings.map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 rounded-full bg-bg-canvas border border-border-soft text-[11px] text-text-muted font-medium"
                      >
                        {b.environment.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Test button */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleTest(conn.id)}
                  disabled={fb === 'testing'}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    fb === 'ok'
                      ? 'bg-success/10 border-success/30 text-success'
                      : fb === 'fail'
                      ? 'bg-danger/10 border-danger/30 text-danger'
                      : 'bg-surface border-border-soft text-text-muted hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {fb === 'testing' ? 'hourglass_top' : fb === 'ok' ? 'check_circle' : fb === 'fail' ? 'error' : 'network_check'}
                  </span>
                  {fb === 'testing' ? 'Testing…' : fb === 'ok' ? 'Connected' : fb === 'fail' ? 'Failed' : 'Test'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
