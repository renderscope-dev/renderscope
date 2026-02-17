"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Monitor,
  Brain,
  Sparkles,
  Box,
  GitBranch,
  Waves,
} from "lucide-react";
import type { Technique } from "@/types/learn";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Monitor,
  Brain,
  Sparkles,
  Box,
  GitBranch,
  Waves,
};

const accentTextColors: Record<string, string> = {
  blue: "text-blue-400",
  green: "text-green-400",
  purple: "text-purple-400",
  pink: "text-pink-400",
  orange: "text-orange-400",
  rose: "text-rose-400",
  cyan: "text-cyan-400",
};

const accentBorderColors: Record<string, string> = {
  blue: "hover:border-blue-500/40",
  green: "hover:border-green-500/40",
  purple: "hover:border-purple-500/40",
  pink: "hover:border-pink-500/40",
  orange: "hover:border-orange-500/40",
  rose: "hover:border-rose-500/40",
  cyan: "hover:border-cyan-500/40",
};

const accentGlowColors: Record<string, string> = {
  blue: "hover:shadow-blue-500/10",
  green: "hover:shadow-green-500/10",
  purple: "hover:shadow-purple-500/10",
  pink: "hover:shadow-pink-500/10",
  orange: "hover:shadow-orange-500/10",
  rose: "hover:shadow-rose-500/10",
  cyan: "hover:shadow-cyan-500/10",
};

interface TechniqueCardProps {
  technique: Technique;
  index: number;
}

export function TechniqueCard({ technique, index }: TechniqueCardProps) {
  const Icon = iconMap[technique.icon];
  const textColor = accentTextColors[technique.accentColor] ?? "text-blue-400";
  const borderHover =
    accentBorderColors[technique.accentColor] ?? "hover:border-blue-500/40";
  const glowHover =
    accentGlowColors[technique.accentColor] ?? "hover:shadow-blue-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
    >
      <Link
        href={`/learn/${technique.id}`}
        className={cn(
          "group relative block rounded-xl border border-border/50 bg-gradient-to-br p-6",
          "transition-all duration-300",
          "hover:shadow-lg hover:scale-[1.02]",
          borderHover,
          glowHover,
          technique.gradient
        )}
      >
        <div
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-background/60",
            textColor
          )}
        >
          {Icon && <Icon className="h-5 w-5" />}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-white transition-colors">
          {technique.name}
        </h3>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {technique.shortDescription}
        </p>

        <span
          className={cn(
            "inline-flex items-center text-sm font-medium transition-colors",
            textColor
          )}
        >
          Learn more
          <svg
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </Link>
    </motion.div>
  );
}
