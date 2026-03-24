interface ConnectionsHeaderProps {
  onAddConnection: () => void;
}

export function ConnectionsHeader({ onAddConnection }: ConnectionsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">Connections</h1>
        <p className="text-sm sm:text-[15px] text-text-muted mt-2 max-w-[680px]">
          Manage source and target connections for integrations in this workspace
        </p>
      </div>

      <button
        type="button"
        onClick={onAddConnection}
        className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center shrink-0"
      >
        Add Connection
      </button>
    </div>
  );
}
