import type { RendererData } from "@/types/renderer";

// ═══════════════════════════════════════════════════════════════
// JSON-LD SCHEMA FACTORIES — Phase 29
// Centralized schema.org structured data generators.
// Each function returns a plain object ready for JSON.stringify.
// ═══════════════════════════════════════════════════════════════

const SITE_URL = "https://renderscope.dev";

// ── WebSite (Landing Page) ──────────────────────────────────────────────────

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RenderScope",
    url: SITE_URL,
    description:
      "Open source platform for cataloging, comparing, and benchmarking rendering engines.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── SoftwareApplication (Renderer Profile) ──────────────────────────────────

const OS_LABELS: Record<string, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
  web: "Web",
  android: "Android",
  ios: "iOS",
};

export function generateSoftwareApplicationSchema(renderer: RendererData) {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: renderer.name,
    description: renderer.description,
    applicationCategory: "MultimediaApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  // Only include fields that have values (avoid null/undefined in JSON-LD)
  if (renderer.platforms && renderer.platforms.length > 0) {
    base.operatingSystem = renderer.platforms
      .map((p) => OS_LABELS[p] ?? p)
      .join(", ");
  }

  if (renderer.version) {
    base.softwareVersion = renderer.version;
  }

  if (renderer.license) {
    base.license = `https://spdx.org/licenses/${renderer.license}`;
  }

  if (renderer.homepage || renderer.repository) {
    base.url = renderer.homepage ?? renderer.repository;
  }

  if (renderer.repository) {
    base.codeRepository = renderer.repository;
  }

  if (renderer.language) {
    base.programmingLanguage = renderer.language;
  }

  if (renderer.github_stars && renderer.github_stars > 0) {
    // Map GitHub stars to a 5-star rating scale (10K+ → 5.0)
    const rating = Math.min(
      5,
      Math.round((renderer.github_stars / 10000) * 5 * 10) / 10
    );
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      bestRating: 5,
      ratingCount: renderer.github_stars,
    };
  }

  return base;
}

// ── Dataset (Benchmarks Page) ───────────────────────────────────────────────

export function generateDatasetSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "RenderScope Benchmark Dataset",
    description:
      "Standardized rendering performance benchmarks across 50+ open source rendering engines. Includes render times, memory usage, PSNR, SSIM, and convergence data.",
    url: `${SITE_URL}/benchmarks`,
    license: "https://spdx.org/licenses/Apache-2.0",
    creator: {
      "@type": "Organization",
      name: "RenderScope",
      url: SITE_URL,
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${SITE_URL}/data/benchmarks`,
    },
    variableMeasured: [
      { "@type": "PropertyValue", name: "Render Time", unitText: "seconds" },
      { "@type": "PropertyValue", name: "Peak Memory", unitText: "MB" },
      { "@type": "PropertyValue", name: "PSNR", unitText: "dB" },
      { "@type": "PropertyValue", name: "SSIM" },
    ],
  };
}

// ── BreadcrumbList (All Pages) ──────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
