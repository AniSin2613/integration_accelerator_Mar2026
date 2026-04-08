type ProfileUpdateStatus =
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'REVIEW_REQUIRED'
  | 'END_OF_SUPPORT'
  | 'BLOCKED_BY_PROFILE_CHANGE';

const LABELS: Record<ProfileUpdateStatus, string> = {
  UP_TO_DATE: 'Up to Date',
  UPDATE_AVAILABLE: 'Update Available',
  REVIEW_REQUIRED: 'Review Required',
  END_OF_SUPPORT: 'End of Support',
  BLOCKED_BY_PROFILE_CHANGE: 'Blocked by Profile Change',
};

const CLASSES: Record<ProfileUpdateStatus, string> = {
  UP_TO_DATE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UPDATE_AVAILABLE: 'border-sky-200 bg-sky-50 text-sky-700',
  REVIEW_REQUIRED: 'border-amber-200 bg-amber-50 text-amber-700',
  END_OF_SUPPORT: 'border-rose-200 bg-rose-50 text-rose-700',
  BLOCKED_BY_PROFILE_CHANGE: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function ProfileUpdateStatusBadge({
  status,
  label,
}: {
  status: ProfileUpdateStatus;
  label?: string;
}) {
  const text = label ? `${label}: ${LABELS[status]}` : LABELS[status];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${CLASSES[status]}`}
    >
      {text}
    </span>
  );
}
