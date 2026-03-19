import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SortOption } from "@/types/renderer";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with compact notation for large values.
 * 1234 → "1.2k", 12345 → "12.3k", 123 → "123"
 */
export function formatStars(count: number | undefined): string {
  if (count === undefined || count === null) return "—";
  if (count >= 10000) return `${(count / 1000).toFixed(0)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

/** Minimum shape required for sorting renderers */
interface SortableRenderer {
  name: string;
  github_stars?: number;
  first_release?: string;
}

/**
 * Sort renderers by the specified sort option.
 * Generic to accept both RendererData[] and RendererCardData[].
 */
export function sortRenderers<T extends SortableRenderer>(
  renderers: T[],
  sort: SortOption
): T[] {
  const sorted = [...renderers];
  switch (sort) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "stars-desc":
      return sorted.sort(
        (a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0)
      );
    case "stars-asc":
      return sorted.sort(
        (a, b) => (a.github_stars ?? 0) - (b.github_stars ?? 0)
      );
    case "newest":
      return sorted.sort((a, b) => {
        const aTime = a.first_release
          ? new Date(a.first_release).getTime()
          : 0;
        const bTime = b.first_release
          ? new Date(b.first_release).getTime()
          : 0;
        return bTime - aTime;
      });
    case "oldest":
      return sorted.sort((a, b) => {
        const aTime = a.first_release
          ? new Date(a.first_release).getTime()
          : 0;
        const bTime = b.first_release
          ? new Date(b.first_release).getTime()
          : 0;
        return aTime - bTime;
      });
    default:
      return sorted;
  }
}

const SLUG_OVERRIDES: Record<string, string> = {
  "pbrt": "PBRT",
  "mitsuba3": "Mitsuba 3",
  "blender-cycles": "Blender Cycles",
  "blender-eevee": "Blender EEVEE",
  "luxcorerender": "LuxCoreRender",
  "pytorch3d": "PyTorch3D",
  "three-js": "three.js",
  "babylon-js": "Babylon.js",
  "vtk": "VTK",
  "pov-ray": "POV-Ray",
  "path-tracing": "Path Tracing",
  "rasterization": "Rasterization",
  "neural-rendering": "Neural Rendering",
  "volume-rendering": "Volume Rendering",
  "differentiable-rendering": "Differentiable Rendering",
  "ray-marching": "Ray Marching",
};

export function formatSlug(slug: string): string {
  if (SLUG_OVERRIDES[slug]) return SLUG_OVERRIDES[slug];
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format an ISO 8601 date string to a human-readable format.
 * "2023-03-28" → "Mar 2023", "2004-07-01" → "Jul 2004"
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}

/**
 * Extract the hostname from a full URL for display.
 * "https://mitsuba-renderer.org/docs" → "mitsuba-renderer.org"
 */
export function formatUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Map an array of identifier strings to human-readable labels using a lookup map.
 * Falls back to the raw identifier with basic formatting if not found in the map.
 */
export function formatListWithFallback(
  items: string[],
  labelMap: Record<string, string>
): string {
  if (!items || items.length === 0) return "";
  return items
    .map((item) => {
      if (labelMap[item]) return labelMap[item];
      // Fallback: replace underscores/hyphens with spaces and title-case
      return item
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(", ");
}

/**
 * Formats an ISO date string into a human-readable relative time.
 * Examples: "2 days ago", "3 months ago", "1 year ago"
 */
export function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "in the future";
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "1 month ago";
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    if (diffDays < 730) return "1 year ago";
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return isoDate;
  }
}

/**
 * Determines the trend direction from a star history array.
 * Returns "up" if last value is >5% higher than first, "down" if lower, "stable" otherwise.
 */
export function calculateTrend(
  values: number[] | undefined
): "up" | "down" | "stable" {
  if (!values || values.length < 2) return "stable";
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (first === 0) return last > 0 ? "up" : "stable";
  const change = (last - first) / first;
  if (change > 0.05) return "up";
  if (change < -0.05) return "down";
  return "stable";
}

/**
 * Returns a freshness tier for a release date, used for color-coding.
 * "fresh" = within 3 months, "aging" = 3-12 months, "stale" = over 1 year
 */
/**
 * Format a render time in seconds to a human-readable string.
 * null → "—", 0.5 → "0.5s", 47.3 → "47.3s", 134 → "2m 14s", 3661 → "1h 1m"
 */
export function formatRenderTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "\u2014";
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);
    if (remaining === 0) return `${minutes}m`;
    return `${minutes}m ${remaining}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format a number with locale-aware thousand separators.
 * 36 → "36", 35947 → "35,947", 1120000 → "1,120,000"
 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Convert a snake_case test label to Title Case.
 * "global_illumination" → "Global Illumination"
 */
export function formatTestLabel(test: string): string {
  return test
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function releaseFreshness(
  isoDate: string
): "fresh" | "aging" | "stale" {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "stale";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);

    if (diffMonths <= 3) return "fresh";
    if (diffMonths <= 12) return "aging";
    return "stale";
  } catch {
    return "stale";
  }
}
