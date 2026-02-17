"use client";

import { Star } from "lucide-react";
import { cn, formatStars } from "@/lib/utils";

interface StarRatingProps {
  stars: number | undefined;
  maxStars?: number;
  showBar?: boolean;
  className?: string;
}

export function StarRating({
  stars,
  maxStars = 50000,
  showBar = true,
  className,
}: StarRatingProps) {
  const count = stars ?? 0;
  const barWidth =
    count > 0
      ? Math.max(
          4,
          (Math.log10(count + 1) / Math.log10(maxStars + 1)) * 100
        )
      : 0;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400/80 text-amber-400/80 shrink-0" />
      <span className="text-sm font-medium tabular-nums text-foreground/80">
        {formatStars(count)}
      </span>
      {showBar && count > 0 && (
        <div className="relative h-1 flex-1 min-w-[40px] max-w-[80px] rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-400/50 transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}
