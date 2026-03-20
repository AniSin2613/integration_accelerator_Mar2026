'use client';

import { useState } from 'react';
import { type ReleaseReadinessData, type IntegrationEnvironment } from './types';

interface PromoteDrawerProps {
  integrationId: string;
  integrationName: string;
  selectedVersion: string;
  fromEnvironment: IntegrationEnvironment;
  toEnvironment: IntegrationEnvironment;
  readiness: ReleaseReadinessData;
  onClose: () => void;
  /** Receives the optional note. Caller is responsible for building the audit payload. */
  onConfirm: (note: string) => void;
}

const ENV_PILL: Record<IntegrationEnvironment, string> = {
  Dev: 'border-blue-200 bg-blue-50 text-blue-700',
  Test: 'border-amber-200 bg-amber-50 text-amber-700',
  Prod: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function PromoteDrawer({
  integrationName,
  selectedVersion,
  fromEnvironment,
  toEnvironment,
  readiness,
  onClose,
  onConfirm,
}: PromoteDrawerProps) {
  const [note, setNote] = useState('');
  const passedCount = readiness.checks.filter((c) => c.passed).length;
  const totalCount = readiness.checks.length;
  const allPassed = passedCount === totalCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Promote ${integrationName} to ${toEnvironment}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel — bottom sheet on mobile, side panel on sm+ */}
      <aside className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface shadow-xl sm:h-full sm:max-h-screen sm:max-w-[440px] sm:rounded-l-2xl sm:rounded-t-none">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-6 py-4">
          <h2 className="text-[16px] font-bold text-text-main">Confirm Promotion</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation drawer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-slate-100 hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {/* Integration name */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Integration</p>
            <p className="mt-1 text-[15px] font-semibold text-text-main">{integrationName}</p>
          </div>

          {/* Version + environments */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Version</p>
              <p className="mt-1 text-[14px] font-semibold text-text-main">{selectedVersion}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Current Environment</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ENV_PILL[fromEnvironment]}`}
                >
                  {fromEnvironment}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Target Environment</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-text-muted" aria-hidden>
                  trending_flat
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ENV_PILL[toEnvironment]}`}
                >
                  {toEnvironment}
                </span>
              </div>
            </div>
          </div>

          {/* Readiness summary */}
          <div className="rounded-lg border border-border-soft bg-background-light px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-text-main">Readiness Summary</p>
              <span
                className={`text-[12px] font-semibold tabular-nums ${allPassed ? 'text-success' : 'text-warning'}`}
              >
                {passedCount}/{totalCount} checks passed
              </span>
            </div>
            {readiness.blockers.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                {readiness.blockers.map((b) => (
                  <div key={b} className="flex items-start gap-1.5 text-[12px] text-danger">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[13px]" aria-hidden>
                      block
                    </span>
                    {b}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[12px] text-success">All checks passed — ready to promote.</p>
            )}
          </div>

          {/* Optional note */}
          <div>
            <label htmlFor="promote-note" className="block text-[13px] font-semibold text-text-main">
              Note{' '}
              <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              id="promote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add context for this promotion — approver name, ticket number, etc."
              className="mt-2 w-full resize-none rounded-lg border border-border-soft bg-background-light px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-soft px-6 py-4 sm:flex-row sm:justify-end">
          <div className="mr-auto flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="material-symbols-outlined text-[13px]" aria-hidden>
              history
            </span>
            This promotion will be recorded in the audit log.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border-soft bg-surface px-5 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Confirm — Promote to {toEnvironment}
          </button>
        </div>
      </aside>
    </div>
  );
}
