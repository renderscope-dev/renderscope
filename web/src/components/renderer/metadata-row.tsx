"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetadataRowProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function MetadataRow({
  label,
  icon: Icon,
  children,
  className,
}: MetadataRowProps) {
  return (
    <div className={cn("flex items-start gap-3 py-2.5", className)}>
      <div className="flex min-w-[130px] shrink-0 items-center gap-2">
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground/60"
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
