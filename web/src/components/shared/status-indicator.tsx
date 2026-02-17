"use client";

import { cn } from "@/lib/utils";
import { statusConfig } from "@/lib/constants";

interface StatusIndicatorProps {
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusIndicator({
  status,
  showLabel = true,
  size = "sm",
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status] ?? { label: "Unknown", color: "text-zinc-500", dotColor: "bg-zinc-500" };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "rounded-full shrink-0",
          config.dotColor,
          status === "active" && "animate-pulse",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span
          className={cn(
            "font-medium",
            config.color,
            size === "sm"
              ? "text-[11px] uppercase tracking-wider"
              : "text-xs"
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
