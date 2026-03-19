import { cn } from "@/lib/utils";
import type { SceneComplexity } from "@/types/scene";

interface ComplexityBadgeProps {
  complexity: SceneComplexity;
  className?: string;
}

const complexityConfig: Record<
  SceneComplexity,
  { label: string; className: string }
> = {
  trivial: {
    label: "Trivial",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  low: {
    label: "Low",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  medium: {
    label: "Medium",
    className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  high: {
    label: "High",
    className: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
  extreme: {
    label: "Extreme",
    className: "text-red-400 bg-red-400/10 border-red-400/20",
  },
};

export function ComplexityBadge({ complexity, className }: ComplexityBadgeProps) {
  const config = complexityConfig[complexity] ?? complexityConfig.medium;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5",
        "text-[11px] font-medium uppercase leading-4 tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
