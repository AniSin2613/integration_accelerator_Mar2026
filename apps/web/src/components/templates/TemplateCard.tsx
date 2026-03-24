import Link from 'next/link';
import { type TemplateItem } from './types';

interface TemplateCardProps {
  template: TemplateItem;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const isPrebuilt = template.group === 'Prebuilt';

  return (
    <article
      className={`rounded-xl border px-4 py-3.5 transition-colors ${
        isPrebuilt
          ? 'border-primary/25 bg-primary/[0.03] shadow-soft hover:border-primary/40'
          : 'border-border-soft bg-surface hover:border-primary/25'
      }`}
    >
      <div>
        <h3 className="text-[15px] font-semibold text-text-main leading-snug">{template.name}</h3>
        <p className="mt-0.5 text-[11px] text-text-muted/75">{template.version} • Updated {template.lastUpdated}</p>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-text-muted line-clamp-1">{template.description}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-text-muted">
          {template.source} {'->'} {template.target} • {template.useCase}
        </p>

        <div className="flex items-center gap-2">
        <Link
          href={`/integrations/new/template?templateId=${template.id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Use Template
        </Link>
        <Link
          href={`/templates?template=${template.id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
        >
          View Details
        </Link>
        </div>
      </div>
    </article>
  );
}
