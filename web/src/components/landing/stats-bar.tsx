"use client";

import { Layers, Sparkles, Code2, GitBranch } from "lucide-react";
import type { LandingPageStats } from "@/lib/data";
import { AnimatedCounter } from "./animated-counter";
import { SectionWrapper } from "./section-wrapper";

const iconMap = {
  Layers,
  Sparkles,
  Code2,
  GitBranch,
} as const;

interface StatItemProps {
  icon: keyof typeof iconMap;
  value: number;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps) {
  const Icon = iconMap[icon];

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3">
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <AnimatedCounter
        target={value}
        className="text-3xl font-bold text-foreground sm:text-4xl"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

interface StatsBarProps {
  stats: LandingPageStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items: StatItemProps[] = [
    { icon: "Layers", value: stats.totalRenderers, label: "Renderers Cataloged" },
    { icon: "Sparkles", value: stats.totalTechniques, label: "Rendering Techniques" },
    { icon: "Code2", value: stats.totalLanguages, label: "Languages Covered" },
    { icon: "GitBranch", value: stats.totalOpenSource, label: "Open Source Projects" },
  ];

  return (
    <SectionWrapper compact className="!max-w-6xl">
      <div data-testid="stats-bar" className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="grid grid-cols-2 divide-border/30 sm:grid-cols-4 sm:divide-x">
          {items.map((item) => (
            <StatItem key={item.label} {...item} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
