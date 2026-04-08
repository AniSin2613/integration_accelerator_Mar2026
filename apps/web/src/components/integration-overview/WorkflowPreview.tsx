'use client';

import { type WorkflowBlock } from './types';
import { getWorkflowNodeIconByKey } from '@/lib/workflow-node-icons';
import { WorkflowNodeIcon } from '@/components/ui/WorkflowNodeIcon';

interface WorkflowPreviewProps {
  blocks: WorkflowBlock[];
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
}

function nodeStatusTone(block: WorkflowBlock): 'success' | 'warning' | 'neutral' {
  const subtitle = block.subtitle.toLowerCase();
  if (subtitle.includes('not configured') || subtitle.includes('none') || subtitle.includes('--')) return 'warning';
  if (subtitle.includes('configured') || subtitle.includes('mapping') || subtitle.includes('manual') || subtitle.includes('alert')) return 'success';
  return 'neutral';
}

export function WorkflowPreview({ blocks, selectedBlockId, onSelectBlock }: WorkflowPreviewProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-text-main">Workflow Preview</h2>
        <p className="mt-1 text-[12px] text-text-muted">Click a node to view details below.</p>
      </div>

      <div className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
        <div className="hidden lg:flex lg:items-stretch lg:gap-2">
          {blocks.map((block) => {
            const isSelected = selectedBlockId === block.id;
            const icon = getWorkflowNodeIconByKey(block.nodeKey);
            const tone = nodeStatusTone(block);
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectBlock(block.id)}
                className={`flex-1 min-w-0 rounded-lg border px-2.5 py-2 text-center transition-colors ${
                  isSelected
                    ? 'border-primary/70 bg-primary/10 ring-2 ring-primary/25 shadow-sm'
                    : 'border-border-soft bg-background-light hover:border-primary/25 hover:bg-slate-50'
                }`}
              >
                <div className="mx-auto flex w-fit items-start gap-1">
                  <WorkflowNodeIcon
                    kind={icon}
                    size={20}
                    className={isSelected ? 'text-primary' : 'text-text-muted'}
                    accentColor="#BF2D42"
                  />
                  <span
                    className={`mt-0.5 inline-flex h-2 w-2 rounded-full ${
                      tone === 'success' ? 'bg-emerald-500/80' : tone === 'warning' ? 'bg-amber-500/80' : 'bg-slate-400/80'
                    }`}
                    aria-hidden
                  />
                </div>
                <p className="mt-2 truncate text-[12px] font-semibold text-text-main">{block.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-text-muted">{block.subtitle}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2 lg:hidden">
          {blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;
            const icon = getWorkflowNodeIconByKey(block.nodeKey);
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
                    <WorkflowNodeIcon kind={icon} size={18} className="text-text-muted" accentColor="#BF2D42" />
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
