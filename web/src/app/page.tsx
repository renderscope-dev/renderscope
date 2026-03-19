import type { Metadata } from "next";
import { getLandingPageStats, getRecentRenderers } from "@/lib/data";
import { getHeroRenderImages, getComparisonPair } from "@/lib/scenes";
import { JsonLd } from "@/components/json-ld";
import {
  generateWebSiteSchema,
  generateBreadcrumbSchema,
} from "@/lib/structured-data";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsBar } from "@/components/landing/stats-bar";
import { FeaturedComparison } from "@/components/landing/featured-comparison";
import { TaxonomyPreview } from "@/components/landing/taxonomy-preview";
import { QuickStartTerminal } from "@/components/landing/quick-start-terminal";
import { RecentUpdates } from "@/components/landing/recent-updates";

const SITE_URL = "https://renderscope.dev";

export const metadata: Metadata = {
  title: {
    absolute:
      "RenderScope — Catalog, Compare & Benchmark Rendering Engines",
  },
  description:
    "The open source platform for exploring, comparing, and benchmarking 50+ rendering engines. From path tracers to neural renderers — structured data, visual comparisons, and CLI tools.",
  keywords: [
    "rendering engines",
    "renderer comparison",
    "path tracing",
    "ray tracing",
    "neural rendering",
    "3D Gaussian Splatting",
    "benchmark",
    "open source",
  ],
  openGraph: {
    title: "RenderScope — Catalog, Compare & Benchmark Rendering Engines",
    description:
      "The open source platform for exploring, comparing, and benchmarking 50+ rendering engines. From path tracers to neural renderers.",
    url: SITE_URL,
    siteName: "RenderScope",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/default.png`,
        width: 1200,
        height: 630,
        alt: "RenderScope — Catalog, Compare & Benchmark Rendering Engines",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RenderScope — Catalog, Compare & Benchmark Rendering Engines",
    description:
      "The open source platform for exploring, comparing, and benchmarking 50+ rendering engines.",
    images: [`${SITE_URL}/og/default.png`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const stats = getLandingPageStats();
  const recentRenderers = getRecentRenderers(4);

  // Load real rendered images for the hero grid and comparison section
  const heroImages = getHeroRenderImages(6).map((img) => ({
    src: img.src,
    renderer: img.rendererName,
    technique: img.technique,
    label: img.scene,
  }));

  const comparisonPair = getComparisonPair();
  const comparisonLeft = comparisonPair
    ? {
        renderer: comparisonPair.left.rendererName,
        technique: comparisonPair.left.technique,
        src: comparisonPair.left.src,
      }
    : undefined;
  const comparisonRight = comparisonPair
    ? {
        renderer: comparisonPair.right.rendererName,
        technique: comparisonPair.right.technique,
        src: comparisonPair.right.src,
      }
    : undefined;

  return (
    <>
      <JsonLd data={generateWebSiteSchema()} />
      <JsonLd
        data={generateBreadcrumbSchema([{ name: "Home", path: "/" }])}
      />
      <HeroSection images={heroImages} />
      <StatsBar stats={stats} />
      <FeaturedComparison left={comparisonLeft} right={comparisonRight} />
      <TaxonomyPreview />
      <QuickStartTerminal />
      <RecentUpdates renderers={recentRenderers} />
    </>
  );
}
