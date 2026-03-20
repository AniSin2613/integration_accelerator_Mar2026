'use client';

import { type WorkflowBlock } from './types';

interface WorkflowPreviewProps {
  blocks: WorkflowBlock[];
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
}

export function WorkflowPreview({ blocks, selectedBlockId, onSelectBlock }: WorkflowPreviewProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold text-text-main">Workflow Preview</h2>

      <div className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
        <div className="hidden xl:flex xl:items-center xl:gap-2 xl:overflow-x-auto xl:pb-2 xl:pr-12">
          {blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;
            return (
              <div key={block.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectBlock(block.id)}
                  className={`min-w-[180px] h-[106px] rounded-lg border px-3.5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/20 shadow-sm'
                      : 'border-border-soft bg-background-light hover:border-primary/25 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-text-muted">{block.icon}</span>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-text-main">{block.title}</p>
                  <p className="mt-1 truncate text-[12px] text-text-muted">{block.subtitle}</p>
                </button>
                {index < blocks.length - 1 ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-soft bg-background-light material-symbols-outlined text-[16px] text-text-muted/85">
                    arrow_forward
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2 xl:hidden">
          {blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;
            return (
              <div key={block.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => onSelectBlock(block.id)}
                  className={`w-full min-h-[84px] rounded-lg border px-3.5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/20 shadow-sm'
                      : 'border-border-soft bg-background-light hover:border-primary/25 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-main">{block.title}</p>
                      <p className="mt-1 truncate text-[12px] text-text-muted">{block.subtitle}</p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-text-muted">{block.icon}</span>
                  </div>
                </button>
                {index < blocks.length - 1 ? (
                  <div className="flex justify-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-soft bg-background-light material-symbols-outlined text-[16px] text-text-muted/85">
                      south
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
