import { type WorkflowBlock } from './types';

interface SelectedNodeDetailsProps {
  block?: WorkflowBlock;
}

export function SelectedNodeDetails({ block }: SelectedNodeDetailsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold text-text-main">Selected Node Details</h2>
      <div className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
        {block ? (
          <>
            <p className="text-[13px] font-semibold text-text-main">{block.title} Details</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {block.detailRows.map((row) => (
                <div key={row.label} className="rounded-lg border border-border-soft bg-background-light px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{row.label}</p>
                  <p className="mt-1 text-[13px] font-medium text-text-main">{row.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">Select a workflow node to view its details.</p>
        )}
      </div>
    </section>
  );
}
