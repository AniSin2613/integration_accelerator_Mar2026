function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-soft bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-border-soft bg-surface p-4 space-y-3">
              <SkeletonBlock className="h-9 w-9" />
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-8 w-14" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-border-soft bg-surface p-4 space-y-3">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-8 w-16" />
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <div className="rounded-xl border border-border-soft bg-surface p-5 space-y-3">
          <SkeletonBlock className="h-5 w-44" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={idx} className="h-10 w-full" />
          ))}
        </div>
        <div className="rounded-xl border border-border-soft bg-surface p-5 space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
