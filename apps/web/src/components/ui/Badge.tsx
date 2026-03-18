import { type ReactNode } from 'react';

type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'draft';

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-100 text-text-muted',
};

const DOT_CLASSES: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-slate-400',
  info: 'bg-blue-500',
  draft: 'bg-slate-400',
};

interface BadgeProps {
  variant?: StatusVariant;
  children?: ReactNode;
  label?: string;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, label, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${VARIANT_CLASSES[variant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[variant]}`} />}
      {children ?? label}
    </span>
  );
}

// Convenience mappers for domain statuses
export function integrationStatusBadge(status: string): { variant: StatusVariant; label: string } {
  const map: Record<string, [StatusVariant, string]> = {
    DRAFT: ['draft', 'Draft'],
    IN_TEST: ['info', 'In Test'],
    LIVE: ['success', 'Live'],
    ATTENTION_NEEDED: ['warning', 'Attention Needed'],
    PAUSED: ['neutral', 'Paused'],
  };
  const [variant, label] = map[status] ?? ['neutral', status];
  return { variant, label };
}

export function runStatusBadge(status: string): { variant: StatusVariant; label: string } {
  const map: Record<string, [StatusVariant, string]> = {
    SUCCESS: ['success', 'Success'],
    FAILED: ['danger', 'Failed'],
    RUNNING: ['info', 'Running'],
    PENDING: ['neutral', 'Pending'],
    RETRYING: ['warning', 'Retrying'],
    CANCELLED: ['neutral', 'Cancelled'],
  };
  const [variant, label] = map[status] ?? ['neutral', status];
  return { variant, label };
}
