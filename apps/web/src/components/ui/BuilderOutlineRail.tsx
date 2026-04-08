'use client';

import { type BuilderStepId, type StepMeta, type StepStatus } from '@/components/builder/types';
import { WorkflowNodeIcon } from '@/components/ui/WorkflowNodeIcon';
import { getWorkflowNodeIconByKey } from '@/lib/workflow-node-icons';

/* ------------------------------------------------------------------ */
/*  BuilderOutlineRail – slim build navigator with labels              */
/* ------------------------------------------------------------------ */

const STEP_SHORT: Record<BuilderStepId, string> = {
  trigger: 'Trigger', sourceGroup: 'Sources', mapping: 'Mapping',
  validation: 'Validate', targetGroup: 'Targets', responseHandling: 'Response', operations: 'Ops',
};

const STATUS_INDICATOR: Record<StepStatus, { dot: string; ring: string; icon: string | null }> = {
  'not-started': { dot: 'bg-slate-300', ring: '', icon: null },
  'in-progress': { dot: 'bg-primary', ring: 'ring-2 ring-primary/20', icon: null },
  complete:      { dot: 'bg-success', ring: '', icon: 'check' },
  warning:       { dot: 'bg-warning', ring: '', icon: 'warning' },
  error:         { dot: 'bg-danger', ring: 'ring-2 ring-danger/20', icon: 'error' },
};

interface BuilderOutlineRailProps {
  steps: StepMeta[];
  activeStep: BuilderStepId;
  onSelectStep: (id: BuilderStepId) => void;
}

export function BuilderOutlineRail({ steps, activeStep, onSelectStep }: BuilderOutlineRailProps) {
  return (
    <nav
      className="flex w-[72px] flex-col items-center border-r border-border-soft bg-surface shrink-0"
      aria-label="Build outline"
    >
      {/* Step label */}
      <div className="w-full px-2 pt-3 pb-2.5">
        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-muted/60 text-center">Steps</p>
      </div>

      {/* Step buttons */}
      <div className="flex flex-1 flex-col items-center gap-0.5 px-1.5 pb-2">
        {steps.map((step, idx) => {
          const isActive = step.id === activeStep;
          const si = STATUS_INDICATOR[step.status];
          const isComplete = step.status === 'complete';
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              title={step.label}
              className={`group relative flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-all ${
                isActive
                  ? 'bg-primary/8 text-primary'
                  : isComplete
                    ? 'text-success hover:bg-slate-50'
                    : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary" />
              )}

              <div className="relative">
                <WorkflowNodeIcon
                  kind={getWorkflowNodeIconByKey(step.id)}
                  size={18}
                  className={isActive ? 'text-primary' : isComplete ? 'text-success' : 'text-text-muted'}
                  accentColor="#BF2D42"
                />
                {/* Status dot */}
                <span className={`absolute -top-0.5 -right-1 flex h-[10px] w-[10px] items-center justify-center rounded-full ${si.dot} ${si.ring}`}>
                  {si.icon && <span className="material-symbols-outlined text-white text-[7px] font-bold">{si.icon}</span>}
                </span>
              </div>
              <span className={`text-[8px] font-semibold leading-none tracking-wide ${
                isActive ? 'text-primary' : isComplete ? 'text-success' : 'text-text-muted'
              }`}>{STEP_SHORT[step.id]}</span>

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-text-main px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
