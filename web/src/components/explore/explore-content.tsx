"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { SearchBar } from "./search-bar";
import { FilterSidebar } from "./filter-sidebar";
import { ActiveFiltersBar } from "./active-filters-bar";
import { ExploreToolbar } from "./explore-toolbar";
import { RendererGrid } from "./renderer-grid";
import { NoResults } from "./no-results";
import { useRendererFilters } from "@/hooks/use-renderer-filters";
import { useFilterCounts } from "@/hooks/use-filter-counts";
import type { RendererData } from "@/types/renderer";
import type { ProcessedGraphData } from "@/types/taxonomy";

// Lazy-load the heavy D3-based graph component — only fetched when graph view is active
const TaxonomyGraph = dynamic(
  () =>
    import("@/components/taxonomy/taxonomy-graph").then(
      (mod) => mod.TaxonomyGraph
    ),
  { ssr: false }
);

interface ExploreContentProps {
  renderers: RendererData[];
  graphData: ProcessedGraphData | null;
}

export function ExploreContent({ renderers, graphData }: ExploreContentProps) {
  const {
    filteredRenderers,
    searchFilteredRenderers,
    totalCount,
    filteredCount,
    query,
    setQuery,
    sort,
    setSort,
    view,
    setView,
    filters,
    toggleFilter,
    clearFilters,
    clearAll,
    activeFilterCount,
    hasFilters,
  } = useRendererFilters({ renderers });

  const filterGroups = useFilterCounts({
    allRenderers: renderers,
    searchFilteredRenderers,
    filters,
  });

  const showActiveFilters = hasFilters || query.length > 0;
  const isGraphView = view === "graph";

  return (
    <div className="space-y-5 pb-16">
      {/* ── Search Bar (hidden in graph view) ── */}
      {!isGraphView && (
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredCount}
          totalCount={totalCount}
        />
      )}

      {/* ── Active Filters Bar (hidden in graph view) ── */}
      {!isGraphView && showActiveFilters && (
        <ActiveFiltersBar
          filters={filters}
          query={query}
          onToggle={toggleFilter}
          onClearQuery={() => setQuery("")}
          onClearAll={clearAll}
        />
      )}

      {/* ── Toolbar (count + sort + view + mobile filter btn) ── */}
      <ExploreToolbar
        filteredCount={filteredCount}
        totalCount={totalCount}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        filterGroups={filterGroups}
        filters={filters}
        onFilterToggle={toggleFilter}
        onFilterClear={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* ── Main Content ── */}
      <AnimatePresence mode="wait">
        {isGraphView ? (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {graphData ? (
              <TaxonomyGraph data={graphData} />
            ) : (
              <div className="flex items-center justify-center min-h-[600px] text-muted-foreground text-sm">
                Taxonomy data is not available.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex gap-8">
              {/* Desktop Filter Sidebar (hidden on mobile/tablet) */}
              <div className="hidden lg:block">
                <FilterSidebar
                  filterGroups={filterGroups}
                  filters={filters}
                  onToggle={toggleFilter}
                  onClear={clearFilters}
                  activeCount={activeFilterCount}
                />
              </div>

              {/* Renderer Grid or Empty State */}
              <div className="flex-1 min-w-0">
                {filteredRenderers.length === 0 ? (
                  <NoResults
                    query={query}
                    hasFilters={hasFilters}
                    onClearAll={clearAll}
                  />
                ) : (
                  <RendererGrid renderers={filteredRenderers} view={view} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
