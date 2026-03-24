function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function TemplatesSkeleton() {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SkeletonBlock className="h-10 w-full xl:col-span-2" />
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonBlock className="h-5 w-64" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border-soft bg-surface px-4 py-3.5 shadow-soft space-y-2.5">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-3.5 w-40" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-[80%]" />
              <div className="flex items-center justify-between gap-2">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-9 w-28" />
                <SkeletonBlock className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
