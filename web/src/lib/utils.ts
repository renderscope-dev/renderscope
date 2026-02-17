import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RendererCardData, SortOption } from "@/types/renderer";

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

/**
 * Sort renderers by the specified sort option.
 */
export function sortRenderers(
  renderers: RendererCardData[],
  sort: SortOption
): RendererCardData[] {
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
