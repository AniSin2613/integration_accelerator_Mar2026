'use client';

import { type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  StoryboardCard – live build block for the workflow stage            */
/* ------------------------------------------------------------------ */

export type CardStatus = 'not-configured' | 'configured' | 'warning' | 'error';

const STATUS_BADGE: Record<CardStatus, { bg: string; text: string; dot: string; label: string; border: string }> = {
  'not-configured': { bg: 'bg-slate-50', text: 'text-text-muted', dot: 'bg-slate-300', label: 'Not configured', border: 'border-slate-200' },
  configured:       { bg: 'bg-success-bg', text: 'text-success-text', dot: 'bg-success', label: 'Configured', border: 'border-success/20' },
  warning:          { bg: 'bg-warning-bg', text: 'text-warning-text', dot: 'bg-warning', label: 'Needs attention', border: 'border-warning/20' },
  error:            { bg: 'bg-danger-bg', text: 'text-danger-text', dot: 'bg-danger', label: 'Blocker', border: 'border-danger/20' },
};

const CARD_ICON_BG: Record<string, string> = {
  trigger:    'bg-amber-50 text-amber-600',
  source:     'bg-emerald-50 text-emerald-600',
  mapping:    'bg-violet-50 text-violet-600',
  validation: 'bg-rose-50 text-rose-600',
  target:     'bg-sky-50 text-sky-600',
  response:   'bg-indigo-50 text-indigo-600',
  operations: 'bg-slate-100 text-slate-600',
};

interface StoryboardCardProps {
  cardKey: string;
  icon: string;
  title: string;
  selected?: boolean;
  status: CardStatus;
  statusLabel?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export function StoryboardCard({
  cardKey,
  icon,
  title,
  selected = false,
  status,
  statusLabel,
  onClick,
  children,
}: StoryboardCardProps) {
  const badge = STATUS_BADGE[status];
  const iconBg = CARD_ICON_BG[cardKey] ?? 'bg-slate-100 text-slate-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-[184px] w-[216px] flex-none flex-col rounded-xl border text-left transition-all duration-200 ${
        selected
          ? 'border-primary bg-surface shadow-[0_0_0_1px_rgba(191,45,66,0.1),0_4px_16px_-2px_rgba(191,45,66,0.12)] ring-1 ring-primary/20 z-10'
          : `${badge.border} bg-surface shadow-soft hover:border-primary/30 hover:shadow-md`
      }`}
    >
      {/* Active editing indicator */}
      {selected && (
        <div className="absolute -top-px left-3 right-3 h-[2px] rounded-b bg-primary" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg} ${selected ? 'ring-1 ring-primary/10' : ''}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold truncate ${selected ? 'text-primary' : 'text-text-main'}`}>
            {title}
          </p>
        </div>
        {selected && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            Editing
          </span>
        )}
      </div>

      {/* Summary content */}
      <div className="flex-1 px-3.5 pb-2 pt-1 space-y-0.5 min-h-[84px]">{children}</div>

      {/* Footer status strip */}
      <div className={`flex items-center gap-1.5 rounded-b-xl border-t px-3.5 py-1.5 ${badge.bg} ${badge.border}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${badge.text}`}>
          {statusLabel ?? badge.label}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  CardRow – key-value summary row inside a StoryboardCard            */
/* ------------------------------------------------------------------ */

export function CardRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[10.5px] leading-relaxed">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className={`truncate text-right font-medium text-text-main ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value}
      </span>
    </div>
  );
}
