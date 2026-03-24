function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function ConnectionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* filter bar skeleton */}
      <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>

      {/* table skeleton */}
      <section className="overflow-hidden rounded-xl border border-border-soft bg-surface shadow-soft">
        <div className="hidden md:block">
          <div className="grid grid-cols-8 gap-4 border-b border-border-soft bg-slate-50 px-5 py-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-4 w-full max-w-[110px]" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid grid-cols-8 gap-4 border-b border-border-soft px-5 py-4 last:border-0">
              <SkeletonBlock className="h-4 w-full max-w-[180px]" />
              <SkeletonBlock className="h-4 w-full max-w-[80px]" />
              <SkeletonBlock className="h-4 w-full max-w-[120px]" />
              <SkeletonBlock className="h-4 w-full max-w-[100px]" />
              <SkeletonBlock className="h-6 w-full max-w-[88px]" />
              <SkeletonBlock className="h-4 w-full max-w-[84px]" />
              <SkeletonBlock className="h-4 w-full max-w-[92px]" />
              <SkeletonBlock className="ml-auto h-4 w-10" />
            </div>
          ))}
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border-soft bg-background-light p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-4 w-24" />
                </div>
                <SkeletonBlock className="h-6 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
              <div className="flex items-center justify-end border-t border-border-soft pt-3">
                <SkeletonBlock className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
