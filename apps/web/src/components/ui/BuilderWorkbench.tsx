'use client';

import { type ReactNode } from 'react';
import { WorkbenchResizeHandle, useWorkbenchResize } from './WorkbenchResizeHandle';
import { WorkbenchTabs, type WorkbenchTabId } from './WorkbenchTabs';

/* ------------------------------------------------------------------ */
/*  BuilderWorkbench – docked studio workbench with resize             */
/* ------------------------------------------------------------------ */

const MIN_HEIGHT = 340;
const MAX_HEIGHT = 640;
const DEFAULT_HEIGHT = 340;

interface BuilderWorkbenchProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  /** Current step index and total steps for progress label */
  stepIndex?: number;
  totalSteps?: number;
  /** Completion/blocker summary chips */
  summary?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  activeTab: WorkbenchTabId;
  onTabChange: (tab: WorkbenchTabId) => void;
  /** Quick actions for header */
  actions?: ReactNode;
  children: ReactNode;
}

export function BuilderWorkbench({
  icon,
  iconBg,
  title,
  subtitle,
  stepIndex,
  totalSteps,
  summary,
  expanded,
  onToggle,
  activeTab,
  onTabChange,
  actions,
  children,
}: BuilderWorkbenchProps) {
  const { height, onPointerDown, onPointerMove, onPointerUp } = useWorkbenchResize({
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
    defaultHeight: DEFAULT_HEIGHT,
  });

  return (
    <div className="flex flex-col bg-surface shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]">
      {/* Resize handle */}
      {expanded && (
        <WorkbenchResizeHandle
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}

      {/* Workbench chrome: header bar */}
      <div className="border-t-2 border-primary/30">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 px-5 py-2 hover:bg-slate-50/40 transition-colors text-left w-full"
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
          </div>
          <div className="flex flex-1 min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="text-[13px] font-semibold text-text-main">{title}</h3>
              {stepIndex && totalSteps && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                  Step {stepIndex} of {totalSteps}
                </span>
              )}
              <span className="hidden lg:inline h-3.5 w-px bg-border-soft" />
              <span className="text-[11px] text-text-muted truncate hidden lg:inline">{subtitle}</span>
            </div>
            {summary && <div className="hidden xl:flex min-w-0 items-center gap-1.5 overflow-hidden">{summary}</div>}
          </div>
          {actions && (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} role="group">
              {actions}
            </div>
          )}
          <span
            className="material-symbols-outlined text-[18px] text-text-muted shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            expand_more
          </span>
        </button>

        {expanded && <WorkbenchTabs activeTab={activeTab} onTabChange={onTabChange} />}
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-border-soft overflow-auto" style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkbenchSection – labelled section inside a workbench             */
/* ------------------------------------------------------------------ */

export function WorkbenchSection({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted/60 whitespace-nowrap">{label}</span>
        <div className="h-px flex-1 bg-border-soft/70" />
      </div>
      {children}
    </div>
  );
}
