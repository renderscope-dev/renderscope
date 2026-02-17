import { Search } from "lucide-react";

export function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Search className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No renderers found
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Try adjusting your filters or search terms to find what you&apos;re
        looking for.
      </p>
    </div>
  );
}
