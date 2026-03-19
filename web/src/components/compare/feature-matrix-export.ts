import type { RefObject } from "react";
import type { RendererData } from "@/types/renderer";
import type { FeatureCategory } from "@/lib/features";

/**
 * Export the feature matrix as a CSV file.
 *
 * Builds a CSV string with renderers as columns, features as rows,
 * grouped by category. Triggers a browser download.
 */
export function exportFeatureMatrixCSV(
  renderers: RendererData[],
  categories: FeatureCategory[]
): void {
  const rows: string[] = [];

  // Header row: Feature, Category, Renderer1, Renderer2, ...
  const header = [
    "Feature",
    "Category",
    ...renderers.map((r) => r.name),
  ];
  rows.push(header.map(csvEscape).join(","));

  // Data rows
  for (const category of categories) {
    for (const feature of category.features) {
      const cells: string[] = [feature.label, category.label];
      for (const renderer of renderers) {
        const value = renderer.features?.[feature.key];
        if (value === true) {
          cells.push("Yes");
        } else if (value === false) {
          cells.push("No");
        } else {
          cells.push("N/A");
        }
      }
      rows.push(cells.map(csvEscape).join(","));
    }
  }

  const csvContent = rows.join("\n");
  triggerDownload(csvContent, "renderscope-feature-comparison.csv", "text/csv");
}

/**
 * Export the feature matrix table as a PNG image via html2canvas.
 *
 * html2canvas is dynamically imported to avoid bundling it eagerly
 * (~40KB gzipped — only needed when the user clicks export).
 */
export async function exportFeatureMatrixPNG(
  tableRef: RefObject<HTMLDivElement | null>
): Promise<void> {
  if (!tableRef.current) return;

  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(tableRef.current, {
    backgroundColor: "#09090f", // Match dark theme background
    scale: 2, // 2x for retina / crisp output
    useCORS: true,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = "renderscope-feature-comparison.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Helpers ──────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
