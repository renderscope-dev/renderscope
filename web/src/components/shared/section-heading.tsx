"use client";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  icon,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mt-12 mb-6", className)}>
      <div className="flex items-center gap-3 border-l-[3px] border-primary/60 pl-4">
        {icon && (
          <span className="shrink-0 text-muted-foreground">{icon}</span>
        )}
        <h2
          id={id}
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-2 pl-4 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
