'use client';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceFieldLabel: string;
  targetFieldLabel: string;
  existingSourceLabel: string;
  onReplace: () => void;
  onCombine: () => void;
  onConditional: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  sourceFieldLabel,
  targetFieldLabel,
  existingSourceLabel,
  onReplace,
  onCombine,
  onConditional,
}: ConflictResolutionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-surface rounded-xl border border-border-soft shadow-floating" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-border-soft">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-warning">warning</span>
              <h2 className="text-sm font-semibold text-text-main">Target Already Mapped</h2>
            </div>
            <p className="text-[12px] text-text-muted leading-relaxed">
              <span className="font-medium text-text-main">{targetFieldLabel}</span> is already mapped from <span className="font-medium text-text-main">{existingSourceLabel}</span>. You&apos;re adding <span className="font-medium text-text-main">{sourceFieldLabel}</span> as another source.
            </p>
          </div>

          {/* Options */}
          <div className="px-5 py-3 space-y-2">
            <button
              onClick={onReplace}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border-soft hover:border-primary/30 hover:bg-primary/[0.02] transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted mt-0.5">swap_horiz</span>
              <div>
                <p className="text-[12px] font-semibold text-text-main">Replace existing mapping</p>
                <p className="text-[11px] text-text-muted mt-0.5">Remove the current source and use {sourceFieldLabel} instead</p>
              </div>
            </button>

            <button
              onClick={onCombine}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border-soft hover:border-primary/30 hover:bg-primary/[0.02] transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted mt-0.5">merge</span>
              <div>
                <p className="text-[12px] font-semibold text-text-main">Combine values</p>
                <p className="text-[11px] text-text-muted mt-0.5">Merge both sources into one target using concat or formula</p>
              </div>
            </button>

            <button
              onClick={onConditional}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border-soft hover:border-primary/30 hover:bg-primary/[0.02] transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted mt-0.5">alt_route</span>
              <div>
                <p className="text-[12px] font-semibold text-text-main">Conditional select</p>
                <p className="text-[11px] text-text-muted mt-0.5">Choose which source to use based on a condition</p>
              </div>
            </button>
          </div>

          {/* Cancel */}
          <div className="px-5 py-3 border-t border-border-soft">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg text-[12px] font-medium text-text-muted hover:bg-background-light transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
