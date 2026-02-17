import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { getAllRenderers, getCatalogStats } from "@/lib/data";
import { ExploreHeader } from "@/components/explore/explore-header";
import { ExploreContent } from "@/components/explore/explore-content";

export const metadata: Metadata = generatePageMetadata({
  title: "Explore Renderers",
  description:
    "Browse and compare 50+ open source rendering engines — from path tracers to neural renderers to real-time rasterizers.",
  path: "/explore",
});

export default function ExplorePage() {
  const renderers = getAllRenderers();
  const stats = getCatalogStats(renderers);

  return (
    <div className="mx-auto w-full max-w-8xl px-4 sm:px-6 lg:px-8">
      <ExploreHeader
        totalCount={stats.total}
        activeCount={stats.activeCount}
      />
      <ExploreContent renderers={renderers} />
    </div>
  );
}
