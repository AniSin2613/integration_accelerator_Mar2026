'use client';

import { type BuilderStepId, type StepMeta, type StepStatus } from '@/components/builder/types';

/* ------------------------------------------------------------------ */
/*  BuilderProgressRail – compact step navigator above the canvas      */
/* ------------------------------------------------------------------ */

const DOT_STYLE: Record<StepStatus, string> = {
  'not-started': 'border-slate-300 bg-white',
  'in-progress': 'border-primary bg-primary/20',
  complete:      'border-success bg-success',
  warning:       'border-warning bg-warning',
  error:         'border-danger bg-danger',
};

const LABEL_STYLE: Record<StepStatus, string> = {
  'not-started': 'text-text-muted',
  'in-progress': 'text-primary',
  complete:      'text-success-text',
  warning:       'text-warning-text',
  error:         'text-danger-text',
};

interface BuilderProgressRailProps {
  steps: StepMeta[];
  activeStep: BuilderStepId;
  onSelectStep: (id: BuilderStepId) => void;
}

export function BuilderProgressRail({ steps, activeStep, onSelectStep }: BuilderProgressRailProps) {
  return (
    <nav className="flex-none bg-surface border-b border-border-soft" aria-label="Builder progress">
      <div className="flex items-center justify-center gap-1 px-4 py-2">
        {steps.map((step, idx) => {
          const isActive = step.id === activeStep;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectStep(step.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/8 text-primary'
                    : 'hover:bg-slate-50 ' + LABEL_STYLE[step.status]
                }`}
              >
                {step.status === 'complete' && !isActive ? (
                  <span className="material-symbols-outlined text-[14px] text-success">check_circle</span>
                ) : step.status === 'warning' && !isActive ? (
                  <span className="material-symbols-outlined text-[14px] text-warning">warning</span>
                ) : step.status === 'error' && !isActive ? (
                  <span className="material-symbols-outlined text-[14px] text-danger">error</span>
                ) : (
                  <span className={`h-2 w-2 rounded-full border-2 shrink-0 ${isActive ? 'border-primary bg-primary' : DOT_STYLE[step.status]}`} />
                )}
                {step.label}
              </button>
              {idx < steps.length - 1 && (
                <span className="material-symbols-outlined text-[10px] text-text-muted/30 mx-0.5">chevron_right</span>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
