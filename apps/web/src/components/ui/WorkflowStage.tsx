'use client';

import { type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  WorkflowStage – framed container for the storyboard canvas         */
/* ------------------------------------------------------------------ */

interface WorkflowStageProps {
  children: ReactNode;
}

export function WorkflowStage({ children }: WorkflowStageProps) {
  return (
    <div className="flex-1 min-h-[250px] flex flex-col overflow-hidden bg-gradient-to-b from-slate-50/80 to-slate-100/40">
      {/* Stage label */}
      <div className="flex-none flex items-center gap-2 px-5 pt-3 pb-1">
        <span className="material-symbols-outlined text-[13px] text-text-muted/40">account_tree</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/50">Integration Workflow</span>
        <div className="flex-1 h-px bg-border-soft/60" />
      </div>

      {/* Stage frame */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-3 pt-1">
        <div className="w-full max-w-[1520px] h-full min-h-[184px] rounded-xl border border-border-soft/80 bg-surface/60 shadow-[inset_0_1px_4px_0_rgba(0,0,0,0.03)] px-3 py-2">
          {children}
        </div>
      </div>
    </div>
  );
}
