'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';

interface TemplateVersion {
  version: string;
  changeNotes: string | null;
}

interface Template {
  id: string;
  name: string;
  class: string;
  sourceSystem: string | null;
  targetSystem: string | null;
  businessObject: string;
  description: string | null;
  versions: TemplateVersion[];
}

const classLabel: Record<string, { label: string; variant: 'success' | 'info' }> = {
  CERTIFIED: { label: 'Certified', variant: 'success' },
  STARTER: { label: 'Starter', variant: 'info' },
};

const boIcon: Record<string, string> = {
  VENDOR: 'person_outline',
  PURCHASE_ORDER: 'receipt_long',
  INVOICE: 'description',
  GENERIC: 'api',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CERTIFIED' | 'STARTER'>('ALL');

  useEffect(() => {
    api.get<Template[]>('/templates').then((data) => {
      setTemplates(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const visible = filter === 'ALL' ? templates : templates.filter((t) => t.class === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        {(['ALL', 'CERTIFIED', 'STARTER'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-muted border-border-soft hover:border-primary/40'
            }`}
          >
            {f === 'ALL' ? 'All Templates' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="ml-auto text-sm text-text-muted">{visible.length} templates</span>
      </div>

      {loading && (
        <div className="p-12 text-center text-text-muted text-sm">Loading templates…</div>
      )}

      {!loading && visible.length === 0 && (
        <div className="p-12 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[48px] text-text-muted/40">folder_open</span>
          <p className="text-text-muted text-sm">No templates found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((tpl) => {
          const cls = classLabel[tpl.class] ?? { label: tpl.class, variant: 'neutral' as const };
          const icon = boIcon[tpl.businessObject ?? 'GENERIC'] ?? 'api';
          const latestVersion = tpl.versions[0]?.version ?? 'v—';

          return (
            <div
              key={tpl.id}
              className="bg-surface rounded-xl border border-border-soft shadow-soft p-6 hover:border-primary/30 transition-colors flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px] text-primary">{icon}</span>
                </div>
                <Badge variant={cls.variant} label={cls.label} />
              </div>

              {/* Name + description */}
              <div>
                <h3 className="font-semibold text-text-main text-sm leading-snug">{tpl.name}</h3>
                {tpl.description && (
                  <p className="text-text-muted text-xs mt-1 line-clamp-2">{tpl.description}</p>
                )}
              </div>

              {/* Source → Target */}
              {(tpl.sourceSystem || tpl.targetSystem) && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="px-2 py-0.5 bg-bg-canvas rounded-md border border-border-soft font-mono">
                    {tpl.sourceSystem ?? '—'}
                  </span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span className="px-2 py-0.5 bg-bg-canvas rounded-md border border-border-soft font-mono">
                    {tpl.targetSystem ?? '—'}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-border-soft flex items-center justify-between">
                <span className="text-xs text-text-muted">Latest: <span className="font-mono font-medium text-text-main">{latestVersion}</span></span>
                <button className="text-xs text-primary font-medium hover:underline">
                  Use template →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
