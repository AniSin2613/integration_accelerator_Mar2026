import Link from 'next/link';
import { type IntegrationHeaderData } from './types';

interface IntegrationOverviewHeaderProps {
  integrationId: string;
  header: IntegrationHeaderData;
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
  isVersionEditable: boolean;
  isLoading?: boolean;
}

export function IntegrationOverviewHeader({
  integrationId,
  header,
  selectedVersionId,
  onVersionChange,
  isVersionEditable,
  isLoading = false,
}: IntegrationOverviewHeaderProps) {
  const editDisabled = isLoading || !isVersionEditable;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      {/* Left: name + metadata */}
      <div className="min-w-0 flex-1">
        {isLoading ? (
          <span className="inline-block h-9 w-64 animate-pulse rounded-lg bg-slate-200/70 align-middle" aria-hidden />
        ) : (
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-text-main leading-tight">{header.name}</h1>
        )}

        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-text-muted">
          {isLoading ? (
            <span className="inline-block h-4 w-56 animate-pulse rounded bg-slate-200/70 align-middle" aria-hidden />
          ) : (
            <>
              <span>{header.templateType}</span>
              <span aria-hidden>•</span>
              <span>Workspace: {header.workspace}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: version selector + actions */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isLoading ? (
          <span className="inline-block h-10 w-32 animate-pulse rounded-lg bg-slate-200/70" aria-hidden />
        ) : (
          <div className="relative flex items-center">
            <select
              value={selectedVersionId}
              onChange={(e) => onVersionChange(e.target.value)}
              aria-label="Select version"
              className="h-10 cursor-pointer appearance-none rounded-lg border border-border-soft bg-surface pl-3 pr-7 text-[12px] font-semibold text-text-muted transition-colors hover:border-primary/40 hover:text-text-main focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {header.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[14px] text-text-muted"
              aria-hidden
            >
              expand_more
            </span>
          </div>
        )}

        <Link
          href={`/integrations/${integrationId}/designer`}
          className={`inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 ${editDisabled ? 'pointer-events-none opacity-40' : ''}`}
          aria-disabled={editDisabled}
          tabIndex={editDisabled ? -1 : undefined}
          title={isVersionEditable ? undefined : 'Historical versions are read-only'}
        >
          Edit Workflow
        </Link>
        <Link
          href="/monitoring"
          className={`inline-flex h-10 items-center justify-center rounded-lg border border-border-soft bg-surface px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50 ${isLoading ? 'pointer-events-none opacity-40' : ''}`}
          aria-disabled={isLoading}
          tabIndex={isLoading ? -1 : undefined}
        >
          View Monitoring
        </Link>
        <Link
          href={`/integrations/${integrationId}/releases`}
          className={`inline-flex h-10 items-center justify-center rounded-lg border border-border-soft bg-surface px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50 ${isLoading ? 'pointer-events-none opacity-40' : ''}`}
          aria-disabled={isLoading}
          tabIndex={isLoading ? -1 : undefined}
        >
          View Releases
        </Link>
      </div>
    </div>
  );
}

