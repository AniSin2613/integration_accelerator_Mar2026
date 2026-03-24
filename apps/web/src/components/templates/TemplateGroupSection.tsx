import { TemplateCard } from './TemplateCard';
import { type TemplateItem } from './types';

interface TemplateGroupSectionProps {
  title: string;
  subtitle: string;
  templates: TemplateItem[];
}

export function TemplateGroupSection({ title, subtitle, templates }: TemplateGroupSectionProps) {
  if (templates.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-text-main">{title}</h2>
        <p className="mt-1 text-[13px] text-text-muted">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </section>
  );
}
