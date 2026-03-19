"use client";

import { Star, Tag, Users, ExternalLink } from "lucide-react";
import { cn, formatStars, formatRelativeDate, calculateTrend, releaseFreshness } from "@/lib/utils";
import { releaseFreshnessColors, trendColors, trendIcons } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityStatsProps {
  stars?: number;
  starsTrend?: number[];
  latestRelease?: string;
  latestReleaseVersion?: string;
  contributors?: number;
  repositoryUrl?: string;
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tooltip?: string;
}

function StatItem({ icon, value, label, tooltip }: StatItemProps) {
  const content = (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/30 bg-card/40 px-4 py-3 transition-colors hover:bg-card/60">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function ActivityStats({
  stars,
  starsTrend,
  latestRelease,
  latestReleaseVersion,
  contributors,
  repositoryUrl,
  className,
}: ActivityStatsProps) {
  const trend = calculateTrend(starsTrend);
  const freshness = latestRelease ? releaseFreshness(latestRelease) : null;

  const hasAnyStats =
    stars !== undefined ||
    latestReleaseVersion !== undefined ||
    contributors !== undefined;

  if (!hasAnyStats) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-wrap items-stretch gap-3",
          className
        )}
      >
        {stars !== undefined && (
          <StatItem
            icon={
              <Star
                className="h-4 w-4 fill-amber-400/80 text-amber-400/80"
                aria-hidden="true"
              />
            }
            value={
              <span className="flex items-center gap-1.5">
                {formatStars(stars)}
                <span
                  className={cn("text-xs font-medium", trendColors[trend])}
                  aria-label={`Trend: ${trend}`}
                >
                  {trendIcons[trend]}
                </span>
              </span>
            }
            label="Stars"
            tooltip={
              trend === "up"
                ? "Star count is trending upward"
                : trend === "down"
                  ? "Star count is trending downward"
                  : "Star count is stable"
            }
          />
        )}

        {latestReleaseVersion !== undefined && (
          <StatItem
            icon={
              <Tag
                className="h-4 w-4 text-muted-foreground/60"
                aria-hidden="true"
              />
            }
            value={
              <span
                className={cn(
                  freshness ? releaseFreshnessColors[freshness] : undefined
                )}
              >
                {latestReleaseVersion}
              </span>
            }
            label={latestRelease ? formatRelativeDate(latestRelease) : "Release"}
            tooltip={
              freshness === "fresh"
                ? "Released within the last 3 months"
                : freshness === "aging"
                  ? "Released 3\u201312 months ago"
                  : freshness === "stale"
                    ? "Released over 1 year ago"
                    : undefined
            }
          />
        )}

        {contributors !== undefined && (
          <StatItem
            icon={
              <Users
                className="h-4 w-4 text-muted-foreground/60"
                aria-hidden="true"
              />
            }
            value={contributors.toLocaleString()}
            label="Contributors"
          />
        )}

        {repositoryUrl && (
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 self-center rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="View repository on GitHub (opens in new tab)"
          >
            <span>View on GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </TooltipProvider>
  );
}
