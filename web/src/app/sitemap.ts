import type { MetadataRoute } from "next";
import { getAllRenderers } from "@/lib/data";
import { getAllTechniqueSlugs } from "@/lib/learn-data";

const SITE_URL = "https://renderscope.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const renderers = getAllRenderers();
  const techniqueSlugs = getAllTechniqueSlugs();

  // ── Static pages ────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/compare`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/benchmarks`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/learn`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/learn/glossary`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/learn/timeline`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/docs/cli`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/docs/api`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/docs/schema`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/docs/methodology`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/docs/citation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/docs/contributing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // ── Dynamic renderer profile pages ──────────────────────────────────────
  const rendererPages: MetadataRoute.Sitemap = renderers.map((renderer) => ({
    url: `${SITE_URL}/renderer/${renderer.id}`,
    lastModified: renderer.latest_release
      ? new Date(renderer.latest_release)
      : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── Dynamic learn technique pages ───────────────────────────────────────
  const learnPages: MetadataRoute.Sitemap = techniqueSlugs.map((slug) => ({
    url: `${SITE_URL}/learn/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...rendererPages, ...learnPages];
}
