'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { InlineSelect } from '@/components/ui/FormFields';
import {
  type TemplateGroup,
  type TemplateItem,
  type VisibilityScope,
} from '@/components/templates/types';

const TYPE_OPTIONS: TemplateGroup[] = ['Prebuilt', 'Generic'];
const VISIBILITY_SCOPE_OPTIONS: VisibilityScope[] = [
  'global',
  'internal_only',
  'tenant_restricted',
  'audience_restricted',
  'demo_profile_restricted',
];

function mapApiTemplate(t: any): TemplateItem {
  const latestVersion = t.versions?.[0];
  const isPrebuilt = t.class === 'CERTIFIED';
  const srcSystem = (t.sourceSystem ?? 'REST API') as TemplateItem['source'];
  const tgtSystem = (t.targetSystem ?? 'REST API') as TemplateItem['target'];
  const bo = (t.businessObject ?? 'API Payload').replace(/_/g, ' ');
  const useCaseLabel = bo.includes('INVOICE') ? 'Invoices'
    : bo.includes('PURCHASE_ORDER') || bo.includes('Purchase Order') ? 'Purchase Orders'
    : bo.includes('VENDOR') || bo.includes('SUPPLIER') ? 'Vendor Sync'
    : `${srcSystem} to ${tgtSystem}`;
  return {
    id: t.id,
    name: t.name,
    group: isPrebuilt ? 'Prebuilt' : 'Generic',
    categoryLabel: isPrebuilt ? 'Prebuilt Template' : 'Generic Template',
    templateTypeTag: isPrebuilt ? 'Prebuilt' : 'Generic',
    description: t.description ?? '',
    source: srcSystem,
    target: tgtSystem,
    useCase: useCaseLabel as TemplateItem['useCase'],
    objectType: bo,
    version: latestVersion?.version ?? 'v1.0',
    lastUpdated: latestVersion?.publishedAt
      ? new Date(latestVersion.publishedAt).toLocaleDateString()
      : 'Recently',
    updatedDaysAgo: latestVersion?.publishedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(latestVersion.publishedAt).getTime()) / 86400000))
      : 0,
    usageCount: 0,
    isPublished: true,
    visibilityScope: 'global' as const,
    audienceTags: ['general' as const],
    allowedTenants: [],
    allowedDemoProfiles: ['generic_enterprise_demo' as const],
  };
}

export function TemplateCatalogPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<any[]>('/templates')
      .then((rows) => {
        if (!cancelled) setTemplates(rows.map(mapApiTemplate));
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateTemplate = (id: string, updates: Partial<TemplateItem>) => {
    setTemplates((current) =>
      current.map((template) => (template.id === id ? { ...template, ...updates } : template)),
    );
  };

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-text-main">Template Catalog</h2>
          <p className="mt-1 text-sm text-text-muted">
            UI-level governance view for template type and visibility settings (internal only).
          </p>
        </div>
        <p className="text-xs font-medium text-text-muted">{loading ? '…' : templates.length} templates</p>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12 text-sm text-text-muted">Loading templates…</div>
      ) : (
      <div className="mt-4 overflow-x-auto rounded-lg border border-border-soft">
        <table className="min-w-[980px] w-full border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Template</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Published</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Visibility</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Audience Tags</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Allowed Tenants</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Demo Profiles</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="border-t border-border-soft align-top">
                <td className="px-3 py-3">
                  <p className="text-sm font-semibold text-text-main">{template.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {template.source} {'->'} {template.target} • {template.useCase}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <label className="sr-only" htmlFor={`type-${template.id}`}>
                    Template type
                  </label>
                  <InlineSelect
                    id={`type-${template.id}`}
                    value={template.group}
                    options={TYPE_OPTIONS}
                    onChange={(nextGroup) => {
                      updateTemplate(template.id, {
                        group: nextGroup as TemplateGroup,
                        categoryLabel: nextGroup === 'Prebuilt' ? 'Prebuilt Template' : 'Generic Template',
                        templateTypeTag: nextGroup === 'Prebuilt' ? 'Business Accelerator' : 'Technical Starter',
                      });
                    }}
                  />
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => updateTemplate(template.id, { isPublished: !template.isPublished })}
                    className={`inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      template.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {template.isPublished ? 'Published' : 'Unpublished'}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <label className="sr-only" htmlFor={`scope-${template.id}`}>
                    Visibility scope
                  </label>
                  <InlineSelect
                    id={`scope-${template.id}`}
                    value={template.visibilityScope}
                    options={VISIBILITY_SCOPE_OPTIONS}
                    onChange={(v) => updateTemplate(template.id, { visibilityScope: v as VisibilityScope })}
                  />
                </td>
                <td className="px-3 py-3 text-xs text-text-muted">{template.audienceTags.join(', ') || '-'}</td>
                <td className="px-3 py-3 text-xs text-text-muted">{template.allowedTenants.join(', ') || '-'}</td>
                <td className="px-3 py-3 text-xs text-text-muted">{template.allowedDemoProfiles.join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
