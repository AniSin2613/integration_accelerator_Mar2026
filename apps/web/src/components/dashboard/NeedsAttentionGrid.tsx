import Link from 'next/link';
import { type DashboardKpis, type AttentionItem } from './types';

/* ── KPI Cards Row ── */

interface KpiCardsRowProps {
  kpis: DashboardKpis;
}

export function KpiCardsRow({ kpis }: KpiCardsRowProps) {
  const cards = [
    {
      label: 'Total Integrations',
      value: String(kpis.totalIntegrations),
      sub: `${kpis.draftIntegrations} draft · ${kpis.activeIntegrations} active`,
      icon: 'integration_instructions',
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Active Pipelines',
      value: String(kpis.activeIntegrations),
      sub: `${kpis.activeIntegrations} live`,
      icon: 'play_circle',
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Connected Systems',
      value: kpis.connectedSystems,
      sub: kpis.failingConnections > 0
        ? `${kpis.failingConnections} failing`
        : kpis.untestedConnections > 0
          ? `${kpis.untestedConnections} untested`
          : 'All healthy',
      icon: 'hub',
      color: kpis.failingConnections > 0 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Runs',
      value: String(kpis.totalRuns),
      sub: kpis.totalRuns > 0
        ? `avg ${kpis.avgDurationSec}s`
        : 'No runs yet',
      icon: 'bolt',
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
              <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
            </div>
            <p className="text-[13px] text-text-muted font-medium">{card.label}</p>
          </div>
          <p className="text-[28px] leading-none font-bold text-text-main mt-3 tabular-nums">{card.value}</p>
          <p className="text-[12px] text-text-muted mt-1">{card.sub}</p>
        </article>
      ))}
    </div>
  );
}

/* ── Action Required Row ── */

interface ActionRequiredRowProps {
  items: AttentionItem[];
}

const ATTENTION_COLORS: Record<string, string> = {
  'failed-runs': 'text-red-700 bg-red-50 border-red-200',
  'pending-approvals': 'text-amber-700 bg-amber-50 border-amber-200',
  'connection-issues': 'text-red-700 bg-red-50 border-red-200',
  'replay-queue': 'text-blue-700 bg-blue-50 border-blue-200',
};

export function ActionRequiredRow({ items }: ActionRequiredRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[14px] font-semibold text-text-muted uppercase tracking-wide">Action Required</h2>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:shadow-sm ${ATTENTION_COLORS[item.id] ?? 'text-text-main bg-surface border-border-soft'}`}
          >
            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
            {item.count} {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
