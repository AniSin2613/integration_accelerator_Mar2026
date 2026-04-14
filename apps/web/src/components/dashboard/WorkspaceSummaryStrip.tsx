import { type WorkspaceInfo } from './types';

interface WorkspaceInfoCardProps {
  workspace: WorkspaceInfo;
}

export function WorkspaceInfoCard({ workspace }: WorkspaceInfoCardProps) {
  const items = [
    { label: 'Workspace', value: workspace.name },
    { label: 'Environment', value: workspace.environment },
    { label: 'Integrations', value: String(workspace.totalIntegrations) },
    { label: 'Connections', value: String(workspace.totalConnections) },
  ];

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5 flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">{item.label}</p>
          <p className="text-[15px] font-semibold text-text-main mt-0.5">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
