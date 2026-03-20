function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function IntegrationOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-soft bg-surface px-4 py-3 sm:px-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 xl:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2 xl:border-r xl:border-border-soft xl:pr-4 last:border-r-0">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-5 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 sm:px-5">
        <SkeletonBlock className="h-4 w-full max-w-xl" />
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-36" />
        <div className="rounded-xl border border-border-soft bg-surface p-5 shadow-soft space-y-3">
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-40" />
        <div className="rounded-xl border border-border-soft bg-surface p-5 shadow-soft space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-40" />
        <div className="rounded-xl border border-border-soft bg-surface shadow-soft">
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border-soft px-5 py-3.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-5 w-24" />
            ))}
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-5 w-full max-w-sm" />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border-soft/85 bg-background-light p-4 space-y-2.5">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-6 w-36" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="rounded-xl border border-border-soft/90 bg-background-light">
            <div className="border-b border-border-soft/80 px-5 py-3.5">
              <SkeletonBlock className="h-5 w-32" />
            </div>
            <div className="space-y-3 p-5">
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
