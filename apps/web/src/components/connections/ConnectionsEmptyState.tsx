interface ConnectionsEmptyStateProps {
  onAddConnection: () => void;
}

export function ConnectionsEmptyState({ onAddConnection }: ConnectionsEmptyStateProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface px-6 py-10 text-center shadow-soft sm:px-8">
      <div className="mx-auto max-w-[680px]">
        <h2 className="text-[22px] font-semibold text-text-main">No connections created yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted/80">
          Create a source or target connection to begin building integrations in this workspace.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onAddConnection}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Add Connection
          </button>
        </div>

        <p className="mt-4 text-[13px] text-text-muted/70">
          Connections created here can be reused across integrations in this workspace.
        </p>
      </div>
    </section>
  );
}
