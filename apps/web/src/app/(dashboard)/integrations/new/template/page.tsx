'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { getTemplatesPageData } from '@/components/templates/mockData';
import { DEFAULT_WORKSPACE_SLUG } from '@/lib/workspace';

function getTemplateIncludes(templateName: string, objectType: string): string[] {
  return [
    `${templateName} workflow scaffold and starting step sequence`,
    `${objectType} mapping structure with baseline validation points`,
    'Default retry/error handling profile suitable for first-pass setup',
  ];
}

function TemplateCreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('templateId') ?? undefined;

  const templates = getTemplatesPageData('demo').templates;
  const selectedTemplate = templateId ? templates.find((template) => template.id === templateId) : undefined;

  const [integrationName, setIntegrationName] = useState(
    selectedTemplate ? `${selectedTemplate.name} Integration` : '',
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDraft = async () => {
    if (!selectedTemplate || !integrationName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api.post<{ id: string }>('/integrations', {
        workspaceSlug: DEFAULT_WORKSPACE_SLUG,
        templateDefId: selectedTemplate.id,
        name: integrationName.trim(),
      });
      router.push(`/integrations/${result.id}/builder`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create integration draft');
      setCreating(false);
    }
  };

  if (!selectedTemplate) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">
            Template-Based Create Entry
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            No template was selected. Choose a template first to continue with template-based creation.
          </p>
        </header>

        <section className="rounded-xl border border-border-soft bg-surface p-5 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/templates"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Back to Templates
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const includes = getTemplateIncludes(selectedTemplate.name, selectedTemplate.objectType);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">
          Start from Template
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Create a new integration draft from a selected template with predefined workflow structure and mapping guidance.
        </p>
      </header>

      <section className="rounded-xl border border-primary/25 bg-primary/[0.03] p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary/80">Selected Template</p>
        <h2 className="mt-1 text-xl font-semibold text-text-main">{selectedTemplate.name}</h2>
        <p className="mt-1.5 text-sm text-text-muted">{selectedTemplate.description}</p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted/80">Source - Target</dt>
            <dd className="mt-1 text-sm font-medium text-text-main">
              {selectedTemplate.source} -&gt; {selectedTemplate.target}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted/80">Template Type</dt>
            <dd className="mt-1 text-sm font-medium text-text-main">{selectedTemplate.templateTypeTag}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-border-soft bg-surface p-4">
          <p className="text-sm font-semibold text-text-main">What this template includes</p>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {includes.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>

        {/* Integration name input */}
        <div className="mt-4">
          <label htmlFor="integration-name" className="block text-sm font-medium text-text-main">
            Integration Name
          </label>
          <input
            id="integration-name"
            type="text"
            value={integrationName}
            onChange={(e) => setIntegrationName(e.target.value)}
            placeholder="e.g. Coupa to SAP Invoice Sync - ACME"
            className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreateDraft}
            disabled={creating || !integrationName.trim()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                Creating Draft…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                Create Integration Draft
              </>
            )}
          </button>
          <Link
            href="/templates"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
          >
            Back to Templates
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function TemplateCreateEntryRoute() {
  return (
    <Suspense fallback={null}>
      <TemplateCreateContent />
    </Suspense>
  );
}
