import { cn } from "@/lib/utils";
import { formatTestLabel } from "@/lib/utils";

interface TestTagsProps {
  tests: string[];
  limit?: number;
  className?: string;
}

export function TestTags({ tests, limit, className }: TestTagsProps) {
  const visibleTests = limit ? tests.slice(0, limit) : tests;
  const remaining = limit ? tests.length - limit : 0;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleTests.map((test) => (
        <span
          key={test}
          className={cn(
            "inline-flex items-center rounded-full border border-border/50 px-2 py-0.5",
            "text-[11px] font-medium leading-4 text-muted-foreground",
            "bg-muted/30"
          )}
        >
          {formatTestLabel(test)}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-1 py-0.5 text-[11px] text-muted-foreground">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
