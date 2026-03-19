"use client";

import { useMemo } from "react";
import type { RendererData, FilterState, FilterOption } from "@/types/renderer";
import {
  extractTechniqueOptions,
  extractLanguageOptions,
  extractLicenseOptions,
  extractPlatformOptions,
  extractStatusOptions,
  computeFilterCounts,
} from "@/lib/filters";

interface UseFilterCountsOptions {
  allRenderers: RendererData[];
  searchFilteredRenderers: RendererData[];
  filters: FilterState;
}

export interface FilterGroupData {
  id: keyof FilterState;
  label: string;
  options: FilterOption[];
  defaultExpanded: boolean;
}

/**
 * Compute filter group data with context-aware counts.
 *
 * The counts update dynamically as filters change:
 * - Selecting "Neural" in technique updates language counts to
 *   show only languages used by neural renderers.
 * - But technique counts themselves show what you'd get if you
 *   toggled each technique option (not narrowed by other technique selections).
 */
export function useFilterCounts({
  allRenderers,
  searchFilteredRenderers,
  filters,
}: UseFilterCountsOptions): FilterGroupData[] {
  return useMemo(() => {
    // Base options (from all renderers, for labels and ordering)
    const baseTechniques = extractTechniqueOptions(allRenderers);
    const baseLanguages = extractLanguageOptions(allRenderers);
    const baseLicenses = extractLicenseOptions(allRenderers);
    const basePlatforms = extractPlatformOptions(allRenderers);
    const baseStatuses = extractStatusOptions(allRenderers);

    // Dynamic counts (considering current filters + search)
    const techniqueCounts = computeFilterCounts(
      allRenderers,
      filters,
      searchFilteredRenderers,
      "techniques"
    );
    const languageCounts = computeFilterCounts(
      allRenderers,
      filters,
      searchFilteredRenderers,
      "languages"
    );
    const licenseCounts = computeFilterCounts(
      allRenderers,
      filters,
      searchFilteredRenderers,
      "licenses"
    );
    const platformCounts = computeFilterCounts(
      allRenderers,
      filters,
      searchFilteredRenderers,
      "platforms"
    );
    const statusCounts = computeFilterCounts(
      allRenderers,
      filters,
      searchFilteredRenderers,
      "statuses"
    );

    // Merge base options with dynamic counts
    const withCounts = (
      base: FilterOption[],
      counts: Map<string, number>
    ): FilterOption[] =>
      base.map((opt) => ({
        ...opt,
        count: counts.get(opt.value) ?? 0,
      }));

    return [
      {
        id: "techniques" as const,
        label: "Technique",
        options: withCounts(baseTechniques, techniqueCounts),
        defaultExpanded: true,
      },
      {
        id: "languages" as const,
        label: "Language",
        options: withCounts(baseLanguages, languageCounts),
        defaultExpanded: true,
      },
      {
        id: "licenses" as const,
        label: "License",
        options: withCounts(baseLicenses, licenseCounts),
        defaultExpanded: false,
      },
      {
        id: "platforms" as const,
        label: "Platform",
        options: withCounts(basePlatforms, platformCounts),
        defaultExpanded: false,
      },
      {
        id: "statuses" as const,
        label: "Status",
        options: withCounts(baseStatuses, statusCounts),
        defaultExpanded: false,
      },
    ];
  }, [allRenderers, searchFilteredRenderers, filters]);
}
