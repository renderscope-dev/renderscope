import { Suspense } from "react";
import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getAllRenderers } from "@/lib/data";
import { getAllScenes } from "@/lib/scenes";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { ComparePageContent } from "@/components/compare";

export const metadata: Metadata = generatePageMetadata({
  title: "Compare Renderers",
  description:
    "Compare rendering engines side-by-side. Feature matrices, visual output comparisons, and performance benchmarks for open source renderers.",
  path: "/compare",
  ogImage: "/og/compare.png",
  keywords: [
    "renderer comparison",
    "rendering engine comparison",
    "PBRT vs Mitsuba",
    "path tracer comparison",
    "benchmark comparison",
  ],
});

export default function ComparePage() {
  const allRenderers = getAllRenderers();
  const allScenes = getAllScenes();

  return (
    <div className="min-h-screen">
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ])}
      />
      <Suspense fallback={null}>
        <ComparePageContent renderers={allRenderers} scenes={allScenes} />
      </Suspense>
    </div>
  );
}
