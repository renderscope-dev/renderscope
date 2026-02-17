"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionPlaceholderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
  className,
}: SectionPlaceholderProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/40 bg-card/30 p-6",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className="h-5 w-5 text-muted-foreground/40"
            aria-hidden="true"
          />
        )}
        <h2 className="text-base font-semibold text-muted-foreground/60">
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground/40">{description}</p>
      )}
    </div>
  );
}
