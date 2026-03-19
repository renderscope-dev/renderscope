"use client";

import {
  Camera,
  Target,
  Lightbulb,
  Sparkles,
  Triangle,
  Box,
  Grid3X3,
  Paintbrush,
  Monitor,
  ImageIcon,
  Brain,
  Cloud,
  Atom,
  ArrowRight,
  Layers,
  Palette,
  RefreshCw,
  GitBranch,
  Ruler,
  CircleDot,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IconName =
  | "Camera"
  | "Target"
  | "Lightbulb"
  | "Sparkles"
  | "Triangle"
  | "Box"
  | "Grid3X3"
  | "Paintbrush"
  | "Monitor"
  | "ImageIcon"
  | "Brain"
  | "Cloud"
  | "Atom"
  | "Layers"
  | "Palette"
  | "RefreshCw"
  | "GitBranch"
  | "Ruler"
  | "CircleDot"
  | "ScanLine";

const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  Camera,
  Target,
  Lightbulb,
  Sparkles,
  Triangle,
  Box,
  Grid3X3,
  Paintbrush,
  Monitor,
  ImageIcon,
  Brain,
  Cloud,
  Atom,
  Layers,
  Palette,
  RefreshCw,
  GitBranch,
  Ruler,
  CircleDot,
  ScanLine,
};

export interface PipelineStep {
  icon: IconName;
  label: string;
  sublabel?: string;
}

interface PipelineDiagramProps {
  steps: PipelineStep[];
  accentColor: string;
  caption?: string;
}

const accentStyles: Record<
  string,
  {
    bg: string;
    border: string;
    icon: string;
    arrow: string;
    glow: string;
    caption: string;
  }
> = {
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    arrow: "text-blue-500/40",
    glow: "shadow-blue-500/5",
    caption: "text-blue-400/60",
  },
  green: {
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    icon: "text-green-400",
    arrow: "text-green-500/40",
    glow: "shadow-green-500/5",
    caption: "text-green-400/60",
  },
  purple: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    icon: "text-purple-400",
    arrow: "text-purple-500/40",
    glow: "shadow-purple-500/5",
    caption: "text-purple-400/60",
  },
  pink: {
    bg: "bg-pink-500/5",
    border: "border-pink-500/20",
    icon: "text-pink-400",
    arrow: "text-pink-500/40",
    glow: "shadow-pink-500/5",
    caption: "text-pink-400/60",
  },
  orange: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    icon: "text-orange-400",
    arrow: "text-orange-500/40",
    glow: "shadow-orange-500/5",
    caption: "text-orange-400/60",
  },
  rose: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    icon: "text-rose-400",
    arrow: "text-rose-500/40",
    glow: "shadow-rose-500/5",
    caption: "text-rose-400/60",
  },
  cyan: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    icon: "text-cyan-400",
    arrow: "text-cyan-500/40",
    glow: "shadow-cyan-500/5",
    caption: "text-cyan-400/60",
  },
};

const defaultAccentStyle = {
  bg: "bg-blue-500/5",
  border: "border-blue-500/20",
  icon: "text-blue-400",
  arrow: "text-blue-500/40",
  glow: "shadow-blue-500/5",
  caption: "text-blue-400/60",
} as const;

export function PipelineDiagram({
  steps,
  accentColor,
  caption,
}: PipelineDiagramProps) {
  const resolved = accentColor in accentStyles
    ? accentStyles[accentColor]
    : undefined;
  const styles = resolved ?? defaultAccentStyle;

  if (!steps || steps.length === 0) return null;

  return (
    <figure className="my-8" role="img" aria-label={caption ?? "Pipeline diagram"}>
      {/* Horizontal layout (desktop) */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {steps.map((step, i) => {
          const Icon = iconMap[step.icon];
          return (
            <div key={i} className="contents">
              <div
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-5 py-4 shadow-lg",
                  styles.bg,
                  styles.border,
                  styles.glow
                )}
              >
                {Icon && <Icon className={cn("h-5 w-5", styles.icon)} />}
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {step.label}
                </span>
                {step.sublabel && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {step.sublabel}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className={cn("h-4 w-4 shrink-0", styles.arrow)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Vertical layout (mobile) */}
      <div className="flex sm:hidden flex-col items-center gap-2">
        {steps.map((step, i) => {
          const Icon = iconMap[step.icon];
          return (
            <div key={i} className="contents">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-5 py-3 w-full max-w-xs shadow-lg",
                  styles.bg,
                  styles.border,
                  styles.glow
                )}
              >
                {Icon && (
                  <Icon className={cn("h-5 w-5 shrink-0", styles.icon)} />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {step.label}
                  </span>
                  {step.sublabel && (
                    <span className="block text-xs text-muted-foreground">
                      {step.sublabel}
                    </span>
                  )}
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight
                  className={cn(
                    "h-4 w-4 rotate-90 shrink-0",
                    styles.arrow
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {caption && (
        <figcaption
          className={cn("mt-3 text-center text-xs", styles.caption)}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
