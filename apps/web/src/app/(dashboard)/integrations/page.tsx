'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, integrationStatusBadge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface IntegrationDefinition {
  id: string;
  name: string;
  status: string;
  description: string | null;
  templateVersion?: { templateDefinition?: { name: string } };
  lastDeployedAt?: string | null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<IntegrationDefinition[]>('/integrations').catch(() => []).then((d) => {
      setIntegrations(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-text-muted">{integrations.length} integration{integrations.length !== 1 ? 's' : ''}</h2>
        <Link
          href="/integrations/new"
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Integration
        </Link>
      </div>

      {loading && (
        <div className="p-12 text-center text-text-muted text-sm">Loading integrations…</div>
      )}

      {!loading && integrations.length === 0 && (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-surface rounded-xl border border-border-soft">
          <span className="material-symbols-outlined text-[48px] text-text-muted/40">account_tree</span>
          <p className="text-text-muted text-sm">No integrations yet. Create one from a template.</p>
          <Link href="/templates" className="text-primary text-sm font-medium hover:underline">
            Browse templates →
          </Link>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border-soft shadow-soft overflow-hidden">
        {integrations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-bg-canvas">
                  <th className="text-left px-5 py-3 text-text-muted font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-text-muted font-medium">Template</th>
                  <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-text-muted font-medium">Last Deployed</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {integrations.map((int) => {
                  const b = integrationStatusBadge(int.status);
                  return (
                    <tr
                      key={int.id}
                      className="border-b border-border-soft last:border-0 hover:bg-bg-canvas/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-semibold text-text-main">{int.name}</span>
                        {int.description && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{int.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-text-muted">
                        {int.templateVersion?.templateDefinition?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={b.variant} label={b.label} />
                      </td>
                      <td className="px-5 py-3 text-text-muted tabular-nums">
                        {int.lastDeployedAt ? new Date(int.lastDeployedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/integrations/${int.id}/designer`}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            Designer
                          </Link>
                          <span className="text-border-soft">|</span>
                          <Link
                            href={`/integrations/${int.id}/mappings`}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            Mappings
                          </Link>
                          <span className="text-border-soft">|</span>
                          <Link
                            href={`/integrations/${int.id}/releases`}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            Releases
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
