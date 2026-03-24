'use client';

interface SecurityRedactionBadgeProps {
  level?: 'public' | 'internal' | 'confidential' | 'restricted';
  text?: string;
}

const LEVEL_STYLE = {
  public: 'bg-slate-100 text-slate-600',
  internal: 'bg-blue-50 text-blue-700',
  confidential: 'bg-amber-50 text-amber-700',
  restricted: 'bg-rose-50 text-rose-700',
};

export function SecurityRedactionBadge({ level = 'confidential', text }: SecurityRedactionBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[level]}`}>
      <span className="material-symbols-outlined text-[12px]">shield_lock</span>
      {text ?? `${level} data redaction`}
    </span>
  );
}
