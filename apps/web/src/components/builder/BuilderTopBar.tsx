'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface BuilderTopBarProps {
  integrationName: string;
  templateLabel: string;
  versionLabel: string;
  validationStatus: 'Not validated' | 'Valid' | 'Warnings';
  environment: 'Dev' | 'Test' | 'Prod';
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  onSaveDraft: () => void;
  onValidate: () => void;
  onTest: () => void;
}

export function BuilderTopBar({
  integrationName,
  templateLabel,
  versionLabel,
  validationStatus,
  environment,
  isDirty,
  isSaving,
  lastSavedAt,
  onSaveDraft,
  onValidate,
  onTest,
}: BuilderTopBarProps) {
  const [savedLabel, setSavedLabel] = useState(lastSavedAt ? 'Saved recently' : 'Not saved');

  useEffect(() => {
    if (!lastSavedAt) {
      setSavedLabel('Not saved');
      return;
    }

    setSavedLabel(
      `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    );
  }, [lastSavedAt]);

  const isReadOnlyEnv = environment !== 'Dev';

  return (
    <header className="flex-none h-14 bg-surface border-b border-border-soft flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
      {/* ── Left: back + breadcrumb + context ── */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/integrations"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-main hover:bg-slate-50 transition-colors"
          aria-label="Back to integrations"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="h-5 w-px bg-border-soft" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-[13px] text-text-muted">Integrations</span>
          <span className="hidden sm:inline text-border-soft">/</span>
          <span className="text-[13px] font-semibold text-text-main truncate max-w-[220px]">
            {integrationName}
          </span>
        </div>
        <Badge variant="draft" dot>Draft</Badge>
        <span className="inline-flex items-center rounded-full border border-border-soft bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-text-muted">
          {versionLabel}
        </span>
        {templateLabel && (
          <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-border-soft bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
            <span className="material-symbols-outlined text-[12px]">layers</span>
            {templateLabel}
          </span>
        )}
      </div>

      {/* ── Right: status + actions ── */}
      <div className="flex items-center gap-2.5">
        <span className="hidden sm:block text-[11px] text-text-muted">
          {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : savedLabel}
        </span>

        <div className="hidden sm:block h-4 w-px bg-border-soft" />

        {/* Environment chip */}
        <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          {environment}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
          validationStatus === 'Valid'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : validationStatus === 'Warnings'
              ? 'border border-amber-200 bg-amber-50 text-amber-700'
              : 'border border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          {validationStatus}
        </span>
        {isReadOnlyEnv && (
          <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <span className="material-symbols-outlined text-[12px]">lock</span>
            Read-only env
          </span>
        )}

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving || !isDirty || isReadOnlyEnv}
          className="inline-flex h-8 items-center rounded-lg border border-border-soft bg-surface px-3 text-[13px] font-medium text-text-main transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onValidate}
          disabled={isReadOnlyEnv}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-soft bg-surface px-3 text-[13px] font-medium text-text-main transition-colors hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-[15px]">check_circle</span>
          Validate
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={isReadOnlyEnv}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[15px]">play_circle</span>
          Test
        </button>
      </div>
    </header>
  );
}
