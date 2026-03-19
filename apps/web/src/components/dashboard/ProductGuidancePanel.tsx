import Link from 'next/link';
import { type GuidanceSignal } from './types';

interface ProductGuidancePanelProps {
  signals: GuidanceSignal[];
}

export function ProductGuidancePanel({ signals }: ProductGuidancePanelProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="text-[16px] font-semibold text-text-main">Product Guidance</h3>
      </div>

      {signals.length === 0 ? (
        <div className="p-5 space-y-3">
          <h4 className="text-[15px] font-semibold text-text-main">Get started with Cogniviti Bridge</h4>
          <p className="text-sm text-text-muted leading-relaxed">
            Create your first connection, choose a starter or certified template, and begin building structured enterprise integrations inside your workspace.
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            <Link href="/connections" className="h-9 px-3.5 rounded-lg border border-border-soft text-sm font-semibold text-text-main hover:bg-slate-50 transition-colors flex items-center">
              Add Connection
            </Link>
            <Link href="/templates" className="h-9 px-3.5 rounded-lg border border-border-soft text-sm font-semibold text-text-main hover:bg-slate-50 transition-colors flex items-center">
              Browse Templates
            </Link>
          </div>
        </div>
      ) : (
        <ul className="p-4 space-y-2.5">
          {signals.map((signal) => (
            <li key={signal.id} className="rounded-lg border border-border-soft bg-background-light px-3.5 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-text-main">{signal.label}</span>
              <span className="text-sm font-semibold text-text-main tabular-nums">{signal.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
