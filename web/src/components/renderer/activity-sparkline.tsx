"use client";

import { useReducedMotion } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivitySparklineProps {
  commitActivity: number[];
  className?: string;
}

interface ChartDataPoint {
  week: number;
  commits: number;
}

function SparklineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-1.5 shadow-lg">
      <p className="text-xs text-muted-foreground">
        Week {data.week}:{" "}
        <span className="font-medium text-foreground">
          {data.commits} commit{data.commits !== 1 ? "s" : ""}
        </span>
      </p>
    </div>
  );
}

export function ActivitySparkline({
  commitActivity,
  className,
}: ActivitySparklineProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!commitActivity || commitActivity.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border/40 bg-card/30 px-6 py-8",
          className
        )}
      >
        <BarChart3
          className="h-5 w-5 shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground/60">
          Commit activity data is not available for this renderer.
        </p>
      </div>
    );
  }

  const data: ChartDataPoint[] = commitActivity.map((commits, index) => ({
    week: index + 1,
    commits,
  }));

  return (
    <div
      className={cn("w-full", className)}
      role="img"
      aria-label={`Commit activity chart showing ${commitActivity.length} weeks of development activity`}
    >
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Tooltip
            content={<SparklineTooltip />}
            cursor={{
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="commits"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#sparklineFill)"
            isAnimationActive={!prefersReducedMotion}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
