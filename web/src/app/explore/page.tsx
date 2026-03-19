import { Suspense } from "react";
import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getAllRenderers, getCatalogStats } from "@/lib/data";
import { getTaxonomyData, processGraphData } from "@/lib/taxonomy";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { ExploreHeader } from "@/components/explore/explore-header";
import { ExploreContent } from "@/components/explore/explore-content";

export const metadata: Metadata = generatePageMetadata({
  title: "Explore Renderers",
  description:
    "Browse and filter 50+ open source rendering engines by technique, language, license, and platform. Path tracers, rasterizers, neural renderers, and more.",
  path: "/explore",
  ogImage: "/og/explore.png",
  keywords: [
    "open source renderers",
    "rendering engine catalog",
    "path tracer list",
    "real-time renderer",
    "neural renderer",
  ],
});

export default function ExplorePage() {
  const renderers = getAllRenderers();
  const stats = getCatalogStats(renderers);

  // Load and process taxonomy data for graph view
  const rawTaxonomy = getTaxonomyData();
  const graphData = rawTaxonomy
    ? processGraphData(rawTaxonomy, renderers)
    : null;

  return (
    <div className="mx-auto w-full max-w-8xl px-4 sm:px-6 lg:px-8">
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
        ])}
      />
      <ExploreHeader
        totalCount={stats.total}
        activeCount={stats.activeCount}
      />
      <Suspense>
        <ExploreContent renderers={renderers} graphData={graphData} />
      </Suspense>
    </div>
  );
}
