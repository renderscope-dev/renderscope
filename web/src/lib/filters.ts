import type { RendererData, FilterState, FilterOption } from "@/types/renderer";
import { techniqueLabels, statusConfig, platformLabels } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
// FILTER EXTRACTION
// Derive available filter options from the actual data.
// ═══════════════════════════════════════════════════════════════

/**
 * Extract all unique technique options from renderer data.
 * Returns options sorted by count (most popular first).
 */
export function extractTechniqueOptions(
  renderers: RendererData[]
): FilterOption[] {
  const counts = new Map<string, number>();
  renderers.forEach((r) => {
    r.technique.forEach((t) => {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: techniqueLabels[value] ?? formatFilterLabel(value),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract all unique language options.
 * The `language` field can be "C++/Python" — treated as a single value.
 */
export function extractLanguageOptions(
  renderers: RendererData[]
): FilterOption[] {
  const counts = new Map<string, number>();
  renderers.forEach((r) => {
    const lang = r.language.trim();
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract all unique license options.
 */
export function extractLicenseOptions(
  renderers: RendererData[]
): FilterOption[] {
  const counts = new Map<string, number>();
  renderers.forEach((r) => {
    counts.set(r.license, (counts.get(r.license) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract all unique platform options.
 */
export function extractPlatformOptions(
  renderers: RendererData[]
): FilterOption[] {
  const counts = new Map<string, number>();
  renderers.forEach((r) => {
    r.platforms.forEach((p) => {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: platformLabels[value] ?? formatFilterLabel(value),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract all unique status options.
 * Ordered by status severity, not count.
 */
export function extractStatusOptions(
  renderers: RendererData[]
): FilterOption[] {
  const counts = new Map<string, number>();
  renderers.forEach((r) => {
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  });

  const statusOrder = [
    "active",
    "maintenance",
    "inactive",
    "archived",
    "deprecated",
  ];

  return statusOrder
    .filter((s) => counts.has(s))
    .map((value) => ({
      value,
      label: statusConfig[value]?.label ?? formatFilterLabel(value),
      count: counts.get(value) ?? 0,
    }));
}

// ═══════════════════════════════════════════════════════════════
// FILTER APPLICATION
// Apply filter state to a list of renderers.
// ═══════════════════════════════════════════════════════════════

/**
 * Apply all active filters to a list of renderers.
 * Filters within the same group are OR'd (e.g., technique=neural OR path_tracing).
 * Filters across groups are AND'd (e.g., technique=neural AND language=Python).
 */
export function applyFilters(
  renderers: RendererData[],
  filters: FilterState
): RendererData[] {
  return renderers.filter((renderer) => {
    // Technique: renderer must have at least one of the selected techniques
    if (filters.techniques.length > 0) {
      const hasMatch = renderer.technique.some((t) =>
        filters.techniques.includes(t)
      );
      if (!hasMatch) return false;
    }

    // Language: renderer language must match one of the selected languages
    if (filters.languages.length > 0) {
      if (!filters.languages.includes(renderer.language)) return false;
    }

    // License: must match one of the selected licenses
    if (filters.licenses.length > 0) {
      if (!filters.licenses.includes(renderer.license)) return false;
    }

    // Platform: renderer must support at least one of the selected platforms
    if (filters.platforms.length > 0) {
      const hasMatch = renderer.platforms.some((p) =>
        filters.platforms.includes(p)
      );
      if (!hasMatch) return false;
    }

    // Status: must match one of the selected statuses
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(renderer.status)) return false;
    }

    return true;
  });
}

/**
 * Count how many active filters are selected across all groups.
 */
export function countActiveFilters(filters: FilterState): number {
  return (
    filters.techniques.length +
    filters.languages.length +
    filters.licenses.length +
    filters.platforms.length +
    filters.statuses.length
  );
}

/**
 * Check if any filters are active.
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return countActiveFilters(filters) > 0;
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC COUNTS
// Recompute filter option counts based on the current filter state.
// This creates the "narrowing" effect where selecting a filter
// updates the counts on all other filter groups.
// ═══════════════════════════════════════════════════════════════

/**
 * Compute context-aware counts for a specific filter group.
 *
 * For each option in the group, count how many renderers match
 * if that option were selected — while keeping all OTHER group
 * filters active. This means selecting "Neural" in technique
 * updates language counts to show only languages used by neural
 * renderers, but technique counts show totals independent of
 * current technique selection.
 */
export function computeFilterCounts(
  _allRenderers: RendererData[],
  currentFilters: FilterState,
  searchFilteredRenderers: RendererData[],
  groupId: keyof FilterState
): Map<string, number> {
  // Apply all filters EXCEPT the current group
  const filtersWithoutGroup: FilterState = {
    ...currentFilters,
    [groupId]: [],
  };

  // Start from search-filtered renderers then apply all other group filters
  const baseRenderers = applyFilters(searchFilteredRenderers, filtersWithoutGroup);

  // Count occurrences of each value in this group
  const counts = new Map<string, number>();

  baseRenderers.forEach((renderer) => {
    const values = getRendererValuesForGroup(renderer, groupId);
    values.forEach((v) => {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    });
  });

  return counts;
}

/**
 * Get the filter-relevant values from a renderer for a given filter group.
 */
function getRendererValuesForGroup(
  renderer: RendererData,
  groupId: keyof FilterState
): string[] {
  switch (groupId) {
    case "techniques":
      return renderer.technique;
    case "languages":
      return [renderer.language];
    case "licenses":
      return [renderer.license];
    case "platforms":
      return renderer.platforms;
    case "statuses":
      return [renderer.status];
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Convert a snake_case or kebab-case string to a Title Case label.
 * Used as a fallback when no explicit label mapping exists.
 */
function formatFilterLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
