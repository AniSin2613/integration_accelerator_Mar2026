'use client';

import { type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  WorkbenchHeader – enhanced header with summary + quick actions      */
/* ------------------------------------------------------------------ */

interface WorkbenchHeaderProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  /** e.g. "6 mapped, 2 required unmapped" */
  summary?: ReactNode;
  actions?: ReactNode;
}

export function WorkbenchHeader({ icon, iconBg, title, subtitle, summary, actions }: WorkbenchHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border-soft bg-surface">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <span className="material-symbols-outlined text-[17px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-text-main">{title}</h3>
          <span className="text-[11px] text-text-muted truncate hidden sm:inline">— {subtitle}</span>
        </div>
        {summary && <div className="flex items-center gap-2 mt-0.5">{summary}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
