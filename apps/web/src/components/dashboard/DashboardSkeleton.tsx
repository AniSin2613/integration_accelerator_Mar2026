function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top split: workspace info + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <div className="rounded-xl border border-border-soft bg-surface p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border-soft bg-surface p-5">
            <SkeletonBlock className="h-[130px] w-[130px] rounded-full mx-auto" />
          </div>
          <div className="rounded-xl border border-border-soft bg-surface p-5 space-y-3">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-[80px] w-full" />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-soft bg-surface p-4 space-y-3">
            <SkeletonBlock className="h-9 w-9" />
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Tables */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border-soft bg-surface p-5 space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, j) => (
            <SkeletonBlock key={j} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
