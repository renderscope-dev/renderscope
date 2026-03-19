import { Search, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoResultsProps {
  query?: string;
  hasFilters?: boolean;
  onClearAll?: () => void;
}

export function NoResults({ query, hasFilters, onClearAll }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-muted/50 p-5 mb-5">
        {hasFilters ? (
          <FilterX className="h-8 w-8 text-muted-foreground/50" />
        ) : (
          <Search className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No renderers found
      </h3>

      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {query && hasFilters
          ? `No renderers match "${query}" with the current filters. Try broadening your search or removing some filters.`
          : query
            ? `No renderers match "${query}". Try a different search term or check your spelling.`
            : hasFilters
              ? "No renderers match the selected filters. Try removing some filters to see more results."
              : "No renderer data found. Make sure renderer JSON files exist in the data directory."}
      </p>

      {(query || hasFilters) && onClearAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="gap-2"
        >
          <FilterX className="h-4 w-4" />
          Clear all filters & search
        </Button>
      )}
    </div>
  );
}
