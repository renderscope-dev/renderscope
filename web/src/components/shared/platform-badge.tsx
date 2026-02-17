"use client";

import { cn } from "@/lib/utils";
import { platformLabels } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const label = platformLabels[platform] ?? platform;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[11px] font-medium tracking-wide px-2 py-0",
        className
      )}
    >
      {label}
    </Badge>
  );
}
