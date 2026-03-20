import { Badge } from '@/components/ui/Badge';
import { type ReleaseReadinessData, type IntegrationEnvironment, type ApprovalState } from './types';

interface ReleaseReadinessPanelProps {
  readiness: ReleaseReadinessData;
  onPromoteToTest: () => void;
  onPromoteToProd: () => void;
}

const ENV_PILL: Record<IntegrationEnvironment, string> = {
  Dev: 'border-blue-200 bg-blue-50 text-blue-700',
  Test: 'border-amber-200 bg-amber-50 text-amber-700',
  Prod: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const APPROVAL_VARIANT: Record<ApprovalState, 'neutral' | 'success' | 'warning'> = {
  'Not Required': 'neutral',
  Approved: 'success',
  'Pending Approval': 'warning',
};

export function ReleaseReadinessPanel({ readiness, onPromoteToTest, onPromoteToProd }: ReleaseReadinessPanelProps) {
  const passedCount = readiness.checks.filter((c) => c.passed).length;
  const totalCount = readiness.checks.length;
  const allPassed = passedCount === totalCount;
  const approvalVariant = APPROVAL_VARIANT[readiness.approvalState] ?? 'neutral';
  const blockerCount = readiness.blockers.length;

  const action =
    readiness.currentEnvironment === 'Dev'
      ? {
          label: 'Promote to Test',
          onClick: onPromoteToTest,
          enabled: readiness.canPromoteToTest,
        }
      : readiness.currentEnvironment === 'Test'
        ? {
            label: 'Promote to Prod',
            onClick: onPromoteToProd,
            enabled: readiness.canPromoteToProd,
          }
        : null;

  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold text-text-main">Release Readiness</h2>

      <div className="rounded-xl border border-border-soft bg-surface shadow-soft">
        {/* Segmented header row */}
        <div className="grid grid-cols-1 border-b border-border-soft sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1 border-b border-border-soft px-5 py-3 sm:border-r sm:border-b-0 sm:border-border-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Version</p>
            <p className="text-[13px] font-semibold text-text-main">{readiness.version}</p>
          </div>

          <div className="space-y-1 border-b border-border-soft px-5 py-3 xl:border-r xl:border-b-0 xl:border-border-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Environment</p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ENV_PILL[readiness.currentEnvironment]}`}
            >
              {readiness.currentEnvironment}
            </span>
          </div>

          <div className="space-y-1 border-b border-border-soft px-5 py-3 sm:border-r sm:border-b-0 sm:border-border-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Promotion Target</p>
            {readiness.promotionTarget ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ENV_PILL[readiness.promotionTarget]}`}
              >
                <span className="material-symbols-outlined text-[12px]" aria-hidden>
                  arrow_forward
                </span>
                {readiness.promotionTarget}
              </span>
            ) : (
              <span className="text-[13px] text-text-muted">None — highest environment</span>
            )}
          </div>

          <div className="space-y-1 px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Approval</p>
            <Badge variant={approvalVariant} label={readiness.approvalState} />
          </div>
        </div>

        {/* Readiness body */}
        <div className="space-y-3 p-4 sm:p-5">
          <ul className="space-y-1.5" aria-label="Readiness checks">
            {readiness.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2">
                <span
                  className={`material-symbols-outlined mt-0.5 shrink-0 text-[16px] ${check.passed ? 'text-success' : 'text-danger'}`}
                  aria-hidden
                >
                  {check.passed ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className={`text-[12.5px] ${check.passed ? 'text-text-main' : 'text-text-muted'}`}>
                    {check.label}
                  </span>
                  {!check.passed && check.detail ? (
                    <p className="mt-0.5 text-[11.5px] text-danger/80">{check.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {readiness.blockers.length > 0 ? (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-3.5 py-2.5">
              <p className="text-[11.5px] font-semibold text-danger">
                {blockerCount === 1 ? '1 blocker preventing promotion' : `${blockerCount} blockers preventing promotion`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {readiness.blockers.map((blocker) => (
                  <li key={blocker} className="flex items-start gap-1.5 text-[11.5px] text-danger/80">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[13px]" aria-hidden>
                      block
                    </span>
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Bottom action bar */}
        <div className="flex flex-col gap-2.5 border-t border-border-soft bg-background-light px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-text-muted">
            <span className={`font-semibold ${allPassed ? 'text-success' : 'text-warning'}`}>
              {passedCount}/{totalCount} checks passed
            </span>
            {blockerCount > 0 ? ` • ${blockerCount} blocker${blockerCount > 1 ? 's' : ''}` : ' • no blockers'}
          </p>

          <div>
            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                disabled={!action.enabled}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action.label}
              </button>
            ) : (
              <p className="text-[12px] text-text-muted">No promotion target for this environment.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
