"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useQueryState } from "nuqs";
import type { RendererData, FilterState, ViewMode, SortOption } from "@/types/renderer";
import {
  queryParser,
  sortParser,
  viewParser,
  techniqueParser,
  languageParser,
  licenseParser,
  platformParser,
  statusParser,
} from "@/lib/url-state";
import { createSearchIndex, searchRenderers } from "@/lib/search";
import {
  applyFilters,
  countActiveFilters,
  hasActiveFilters,
} from "@/lib/filters";
import { sortRenderers } from "@/lib/utils";

interface UseRendererFiltersOptions {
  renderers: RendererData[];
}

interface UseRendererFiltersReturn {
  // ── Derived Data ──
  filteredRenderers: RendererData[];
  searchFilteredRenderers: RendererData[];
  totalCount: number;
  filteredCount: number;

  // ── URL State ──
  query: string;
  setQuery: (q: string) => void;
  sort: SortOption;
  setSort: (s: SortOption) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;

  // ── Filter State ──
  filters: FilterState;
  toggleFilter: (group: keyof FilterState, value: string) => void;
  clearFilters: () => void;
  clearAll: () => void;
  activeFilterCount: number;
  hasFilters: boolean;

  // ── Transition State ──
  isPending: boolean;
}

export function useRendererFilters({
  renderers,
}: UseRendererFiltersOptions): UseRendererFiltersReturn {
  const [isPending, startTransition] = useTransition();

  // ── URL State (synced with browser URL bar) ──
  const [query, setQueryRaw] = useQueryState("q", queryParser);
  const [sort, setSortRaw] = useQueryState("sort", sortParser);
  const [view, setViewRaw] = useQueryState("view", viewParser);
  const [techniques, setTechniques] = useQueryState(
    "technique",
    techniqueParser
  );
  const [languages, setLanguages] = useQueryState("language", languageParser);
  const [licenses, setLicenses] = useQueryState("license", licenseParser);
  const [platforms, setPlatforms] = useQueryState("platform", platformParser);
  const [statuses, setStatuses] = useQueryState("status", statusParser);

  // ── Compose Filter State ──
  const filters: FilterState = useMemo(
    () => ({
      techniques: techniques ?? [],
      languages: languages ?? [],
      licenses: licenses ?? [],
      platforms: platforms ?? [],
      statuses: statuses ?? [],
    }),
    [techniques, languages, licenses, platforms, statuses]
  );

  // ── Search Index (created once, stable reference) ──
  const searchIndex = useMemo(
    () => createSearchIndex(renderers),
    [renderers]
  );

  // ── Pipeline: Search → Filter → Sort ──

  // Step 1: Apply search
  const searchFilteredRenderers = useMemo(
    () => searchRenderers(searchIndex, query ?? "", renderers),
    [searchIndex, query, renderers]
  );

  // Step 2: Apply filters, then sort
  const filteredRenderers = useMemo(() => {
    const filtered = applyFilters(searchFilteredRenderers, filters);
    return sortRenderers(filtered, (sort ?? "stars-desc") as SortOption);
  }, [searchFilteredRenderers, filters, sort]);

  // ── Filter Actions ──

  const toggleFilter = useCallback(
    (group: keyof FilterState, value: string) => {
      const setters: Record<
        keyof FilterState,
        (values: string[] | null) => void
      > = {
        techniques: (v) => void setTechniques(v),
        languages: (v) => void setLanguages(v),
        licenses: (v) => void setLicenses(v),
        platforms: (v) => void setPlatforms(v),
        statuses: (v) => void setStatuses(v),
      };

      const current = filters[group];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      startTransition(() => {
        setters[group](updated.length > 0 ? updated : null);
      });
    },
    [filters, setTechniques, setLanguages, setLicenses, setPlatforms, setStatuses]
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      void setTechniques(null);
      void setLanguages(null);
      void setLicenses(null);
      void setPlatforms(null);
      void setStatuses(null);
    });
  }, [setTechniques, setLanguages, setLicenses, setPlatforms, setStatuses]);

  const clearAll = useCallback(() => {
    startTransition(() => {
      void setQueryRaw(null);
      void setTechniques(null);
      void setLanguages(null);
      void setLicenses(null);
      void setPlatforms(null);
      void setStatuses(null);
    });
  }, [
    setQueryRaw,
    setTechniques,
    setLanguages,
    setLicenses,
    setPlatforms,
    setStatuses,
  ]);

  return {
    filteredRenderers,
    searchFilteredRenderers,
    totalCount: renderers.length,
    filteredCount: filteredRenderers.length,

    query: query ?? "",
    setQuery: (q: string) =>
      startTransition(() => {
        void setQueryRaw(q || null);
      }),
    sort: (sort ?? "stars-desc") as SortOption,
    setSort: (s: SortOption) =>
      startTransition(() => {
        void setSortRaw(s);
      }),
    view: (view ?? "grid") as ViewMode,
    setView: (v: ViewMode) =>
      startTransition(() => {
        void setViewRaw(v);
      }),

    filters,
    toggleFilter,
    clearFilters,
    clearAll,
    activeFilterCount: countActiveFilters(filters),
    hasFilters: hasActiveFilters(filters),

    isPending,
  };
}
