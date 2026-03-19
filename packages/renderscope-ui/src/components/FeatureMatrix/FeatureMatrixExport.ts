/**
 * FeatureMatrixExport — Pure utility functions for CSV and PNG export.
 *
 * CSV export is zero-dependency and always works.
 * PNG export requires `html2canvas` as an optional peer dependency.
 *
 * @internal Not part of the public API.
 */

import type {
  FeatureMatrixRenderer,
  FeatureCategory,
} from "../../types/feature-matrix";

/* ── Helpers ── */

function csvEscape(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function featureValueLabel(
  value: boolean | null | undefined,
): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "N/A";
}

/* ── CSV Export ── */

export function exportFeatureMatrixCSV(
  renderers: FeatureMatrixRenderer[],
  features: FeatureCategory[],
): void {
  const rows: string[] = [];

  // Header row
  const header = [
    "Feature",
    "Category",
    ...renderers.map((r) => r.name),
  ];
  rows.push(header.map(csvEscape).join(","));

  // Data rows grouped by category
  for (const category of features) {
    for (const feature of category.features) {
      const cells = [
        feature.label,
        category.label,
        ...renderers.map((r) =>
          featureValueLabel(r.features[feature.key]),
        ),
      ];
      rows.push(cells.map(csvEscape).join(","));
    }
  }

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, "feature-comparison.csv");
}

/* ── PNG Export ── */

export async function exportFeatureMatrixPNG(
  tableElement: HTMLElement,
): Promise<void> {
  try {
    const html2canvas = (await import("html2canvas")).default;

    // Temporarily remove scroll constraints so the full table is captured
    const scrollEl = tableElement;
    const prevOverflow = scrollEl.style.overflow;
    const prevMaxHeight = scrollEl.style.maxHeight;
    scrollEl.style.overflow = "visible";
    scrollEl.style.maxHeight = "none";

    const canvas = await html2canvas(scrollEl, {
      backgroundColor: "#09090f",
      scale: 2,
    });

    // Restore scroll constraints
    scrollEl.style.overflow = prevOverflow;
    scrollEl.style.maxHeight = prevMaxHeight;

    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, "feature-comparison.png");
      }
    }, "image/png");
  } catch {
    console.warn(
      'renderscope-ui: PNG export requires "html2canvas" to be installed. ' +
        "Run: npm install html2canvas",
    );
  }
}
