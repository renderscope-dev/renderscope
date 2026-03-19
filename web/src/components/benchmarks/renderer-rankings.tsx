"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Zap, HardDrive, Target } from "lucide-react";
import type { BenchmarkEntry } from "@/types/benchmark";
import { computeRankings, type RankingResult } from "@/lib/benchmark-rankings";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// RENDERER RANKINGS — Auto-computed highlight cards showing
// the top performers: fastest, most memory-efficient, highest quality.
// ═══════════════════════════════════════════════════════════════

const ICON_MAP = {
  Zap,
  HardDrive,
  Target,
} as const;

const ACCENT_MAP: Record<string, { border: string; icon: string; badge: string }> = {
  amber: {
    border: "border-t-amber-500/60",
    icon: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400",
  },
  teal: {
    border: "border-t-teal-500/60",
    icon: "text-teal-400",
    badge: "bg-teal-500/10 text-teal-400",
  },
  violet: {
    border: "border-t-violet-500/60",
    icon: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400",
  },
};

function RankingCard({ ranking, index }: { ranking: RankingResult; index: number }) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = ICON_MAP[ranking.icon];
  const accent = ACCENT_MAP[ranking.accentColor] ?? ACCENT_MAP["amber"]!;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/10",
        "border-t-2",
        accent.border
      )}
    >
      {/* Category header */}
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("rounded-md p-1.5", accent.badge)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {ranking.label}
        </span>
      </div>

      {/* Winner */}
      <h3 className="mb-1 text-xl font-bold tracking-tight text-foreground">
        {ranking.winnerName}
      </h3>
      <p className="mb-1 text-lg font-semibold tabular-nums text-foreground/90">
        {ranking.formattedValue}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        avg across {ranking.sceneCount} scene{ranking.sceneCount !== 1 ? "s" : ""}
      </p>

      {/* Mini leaderboard */}
      {ranking.runners.length > 0 && (
        <div className="space-y-1.5 border-t border-border/30 pt-3">
          {/* Always show the winner as #1 */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className={cn("font-bold tabular-nums", accent.icon)}>1st</span>
              <span className="font-medium text-foreground">{ranking.winnerName}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {ranking.formattedValue.replace(" avg", "")}
            </span>
          </div>

          {ranking.runners.map((runner, i) => (
            <div key={runner.rendererId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold tabular-nums text-muted-foreground">
                  {i === 0 ? "2nd" : "3rd"}
                </span>
                <span className="text-muted-foreground">{runner.rendererName}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {runner.formattedValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface RendererRankingsProps {
  entries: BenchmarkEntry[];
  rendererNames: Record<string, string>;
  className?: string;
}

export function RendererRankings({
  entries,
  rendererNames,
  className,
}: RendererRankingsProps) {
  const rankings = useMemo(
    () => computeRankings(entries, rendererNames),
    [entries, rendererNames]
  );

  // Hide when fewer than 2 renderers — rankings are meaningless
  if (rankings.length === 0) return null;

  return (
    <div data-testid="ranking-cards" className={className}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rankings.map((ranking, i) => (
          <RankingCard key={ranking.category} ranking={ranking} index={i} />
        ))}
      </div>
    </div>
  );
}
