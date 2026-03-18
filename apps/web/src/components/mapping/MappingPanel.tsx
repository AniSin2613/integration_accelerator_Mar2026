import { type ReactNode } from 'react';

interface MappingPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function MappingPanel({ title, subtitle, children }: MappingPanelProps) {
  return (
    <section className="bg-surface rounded-xl border border-border-soft shadow-soft overflow-hidden">
      <header className="px-5 py-3 border-b border-border-soft bg-bg-canvas">
        <h2 className="text-sm font-semibold text-text-main">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </header>
      <div>{children}</div>
    </section>
  );
}
