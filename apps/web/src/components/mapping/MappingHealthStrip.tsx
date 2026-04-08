interface MappingHealthStripProps {
  requiredMapped: number;
  requiredTotal: number;
  blockers: number;
  nextTargets: string[];
  sourceUsed?: number;
  sourceTotal?: number;
  unreviewedAiCount?: number;
}

export function MappingHealthStrip({
  requiredMapped,
  requiredTotal,
  blockers,
  nextTargets,
  sourceUsed,
  sourceTotal,
  unreviewedAiCount = 0,
}: MappingHealthStripProps) {
  const done = requiredTotal > 0 && requiredMapped === requiredTotal;
  const nextHint = nextTargets.length > 0 ? nextTargets.join(', ') : 'Review optional mappings and validate';
  const showCoverage = typeof sourceUsed === 'number' && typeof sourceTotal === 'number' && sourceTotal > 0;

  return (
    <section className={`border-b px-4 py-2.5 ${done && unreviewedAiCount === 0 ? 'border-success/20 bg-success-bg' : 'border-warning/20 bg-warning-bg'}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-[12px] font-semibold text-text-main">
          {requiredMapped} of {requiredTotal} required target fields mapped
        </p>

        {showCoverage && (
          <p className="text-[12px] text-text-muted">
            Source fields used:{' '}
            <span className="font-semibold text-text-main">{sourceUsed}/{sourceTotal}</span>
          </p>
        )}

        {unreviewedAiCount > 0 && (
          <p className="text-[12px] font-semibold text-ai-text flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
            {unreviewedAiCount} AI suggestion{unreviewedAiCount === 1 ? '' : 's'} need review before promoting
          </p>
        )}

        <p className={`text-[12px] font-semibold ${blockers > 0 ? 'text-warning-text' : 'text-success-text'}`}>
          {blockers} blocker{blockers === 1 ? '' : 's'} remaining
        </p>

        {blockers > 0 && (
          <p className="text-[12px] text-text-muted">
            Next: <span className="font-semibold text-text-main">{nextHint}</span>
          </p>
        )}
      </div>
    </section>
  );
}
