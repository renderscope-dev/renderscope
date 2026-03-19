/**
 * Skeleton placeholder for the Compare page Performance tab.
 *
 * Displayed while Recharts and the performance chart components
 * are being dynamically loaded. Matches the layout of the real
 * PerformanceTab to prevent CLS.
 */
export function PerformanceTabSkeleton() {
  return (
    <div className="space-y-8" role="tabpanel">
      {/* Hardware context banner skeleton */}
      <div className="h-16 w-full rounded-lg bg-card animate-pulse" />

      {/* Performance comparison section */}
      <section>
        <div className="mb-4">
          <div className="mb-2 h-6 w-56 rounded bg-card animate-pulse" />
          <div className="h-4 w-96 rounded bg-card animate-pulse" />
        </div>
        <div className="h-80 w-full rounded-xl bg-card animate-pulse flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading benchmark chart&hellip;
          </p>
        </div>
      </section>

      {/* Convergence analysis section */}
      <section>
        <div className="mb-4">
          <div className="mb-2 h-6 w-48 rounded bg-card animate-pulse" />
          <div className="h-4 w-80 rounded bg-card animate-pulse" />
        </div>
        <div className="h-80 w-full rounded-xl bg-card animate-pulse flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading convergence plot&hellip;
          </p>
        </div>
      </section>
    </div>
  );
}
