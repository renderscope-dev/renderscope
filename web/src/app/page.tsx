import type { Metadata } from "next";
import Link from "next/link";
import { getLandingPageStats, getRecentRenderers } from "@/lib/data";
import { getHeroRenderImages, getComparisonPair } from "@/lib/scenes";
import { JsonLd } from "@/components/json-ld";
import {
  generateWebSiteSchema,
  generateBreadcrumbSchema,
} from "@/lib/structured-data";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturedComparison } from "@/components/landing/featured-comparison";
import { TaxonomyPreview } from "@/components/landing/taxonomy-preview";
import { QuickStartTerminal } from "@/components/landing/quick-start-terminal";
import { RecentUpdates } from "@/components/landing/recent-updates";
import { Github, ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/constants";

const SITE_URL = "https://render-scope.web.app";

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
      <HeroSection images={heroImages} stats={stats} />
      <FeaturedComparison left={comparisonLeft} right={comparisonRight} />
      <TaxonomyPreview />
      <QuickStartTerminal />
      <RecentUpdates renderers={recentRenderers} />

      {/* ── Final CTA Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/50">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-mesh-light" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to explore the rendering landscape?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Dive into 50+ rendering engines, compare techniques side by side,
            and benchmark performance &mdash; all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/explore"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
            >
              Start Exploring
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background/80 px-8 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all hover:border-foreground/20 hover:shadow-md"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
