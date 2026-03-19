import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import {
  getAllBenchmarks,
  getHardwareProfiles,
  getRendererNameMap,
  getSceneNameMap,
  toBenchmarkTableRows,
  getBenchmarkOverview,
} from "@/lib/benchmark-data";
import { JsonLd } from "@/components/json-ld";
import {
  generateDatasetSchema,
  generateBreadcrumbSchema,
} from "@/lib/structured-data";
import { BenchmarkDashboard } from "@/components/benchmarks";

export const metadata: Metadata = generatePageMetadata({
  title: "Benchmark Dashboard",
  description:
    "Standardized performance benchmarks for open source rendering engines. Render times, memory usage, convergence curves, and image quality metrics.",
  path: "/benchmarks",
  ogImage: "/og/benchmarks.png",
  keywords: [
    "renderer benchmarks",
    "rendering performance",
    "render time comparison",
    "PSNR",
    "SSIM",
    "image quality metrics",
  ],
});

export default function BenchmarksPage() {
  const benchmarks = getAllBenchmarks();
  const rendererNames = getRendererNameMap();
  const sceneNames = getSceneNameMap();
  const rows = toBenchmarkTableRows(benchmarks, rendererNames, sceneNames);
  const hardwareProfiles = getHardwareProfiles(benchmarks);
  const overview = getBenchmarkOverview(benchmarks);

  const availableRenderers = [...new Set(rows.map((r) => r.renderer))].map(
    (id) => ({
      id,
      name: rendererNames[id]?.name ?? id,
    })
  );
  const availableScenes = [...new Set(rows.map((r) => r.scene))].map(
    (id) => ({
      id,
      name: sceneNames[id]?.name ?? id,
    })
  );

  return (
    <>
      <JsonLd data={generateDatasetSchema()} />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Benchmarks", path: "/benchmarks" },
        ])}
      />
      <BenchmarkDashboard
        rows={rows}
        hardwareProfiles={hardwareProfiles}
        overview={overview}
        availableRenderers={availableRenderers}
        availableScenes={availableScenes}
        rawBenchmarks={benchmarks}
      />
    </>
  );
}
