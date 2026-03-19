/**
 * Skeleton placeholder for Recharts-based chart components.
 *
 * Shown while the chart bundle is being dynamically loaded.
 * Matches the approximate dimensions of the real chart section
 * so there is no layout shift (CLS) when the chart appears.
 */
export function ChartSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Chart area placeholder */}
      <div className="h-80 w-full rounded-xl bg-card animate-pulse flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading chart&hellip;</p>
      </div>
    </div>
  );
}

/**
 * Larger skeleton for the full benchmark charts section
 * (rankings + bar chart + convergence + scene breakdown).
 */
export function BenchmarkChartsSectionSkeleton() {
  return (
    <div className="w-full space-y-12">
      {/* Section divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <span className="relative bg-background px-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Charts &amp; Rankings
        </span>
      </div>

      {/* Section heading */}
      <div>
        <div className="mb-1 h-7 w-48 rounded bg-card animate-pulse" />
        <div className="h-4 w-80 rounded bg-card animate-pulse" />
      </div>

      {/* Rankings skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-card animate-pulse"
          />
        ))}
      </div>

      {/* Bar chart skeleton */}
      <div className="h-80 w-full rounded-xl bg-card animate-pulse flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading performance chart&hellip;
        </p>
      </div>

      {/* Convergence plot skeleton */}
      <div className="h-80 w-full rounded-xl bg-card animate-pulse flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading convergence plot&hellip;
        </p>
      </div>
    </div>
  );
}
