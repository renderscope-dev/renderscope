"use client";

import { cn } from "@/lib/utils";
import { techniqueLabels, techniqueColorMap } from "@/lib/constants";

interface TechniqueBadgeProps {
  technique: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TechniqueBadge({
  technique,
  size = "sm",
  className,
}: TechniqueBadgeProps) {
  const label = techniqueLabels[technique] ?? technique;
  const colorKey = techniqueColorMap[technique] ?? "technique-path-tracing";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "border transition-colors duration-150",
        size === "sm" && "px-2 py-0.5 text-[11px] leading-4 tracking-wide uppercase",
        size === "md" && "px-2.5 py-0.5 text-xs leading-5 tracking-wide uppercase",
        size === "lg" && "px-3 py-1 text-sm leading-5 tracking-wide uppercase",
        className
      )}
      style={{
        color: `hsl(var(--${colorKey}))`,
        backgroundColor: `hsl(var(--${colorKey}) / 0.1)`,
        borderColor: `hsl(var(--${colorKey}) / 0.2)`,
      }}
    >
      {label}
    </span>
  );
}
