import type { Metadata } from "next";

// ═══════════════════════════════════════════════════════════════
// SEO UTILITY — Phase 29
// Centralized metadata generation for every page.
// ═══════════════════════════════════════════════════════════════

const SITE_URL = "https://renderscope.dev";
const SITE_NAME = "RenderScope";
const DEFAULT_OG_IMAGE = "/og/default.png";

export interface PageSEO {
  /** Page title — will be appended with "| RenderScope" via layout template */
  title: string;
  /** Meta description (aim for 120–160 characters) */
  description: string;
  /** URL path relative to site root, e.g. "/explore" */
  path: string;
  /** OG image path relative to public dir, e.g. "/og/renderer-pbrt.png" */
  ogImage?: string;
  /** OpenGraph type — defaults to "website" */
  ogType?: "website" | "article" | "profile";
  /** Set true for pages that shouldn't be indexed (e.g. internal docs) */
  noIndex?: boolean;
  /** SEO keywords for the page */
  keywords?: string[];
}

/**
 * Generate a complete Next.js Metadata object with OpenGraph, Twitter Card,
 * canonical URL, and optional keyword/robots directives.
 */
export function generatePageMetadata(seo: PageSEO): Metadata {
  const url = `${SITE_URL}${seo.path}`;
  const ogImage = seo.ogImage ?? DEFAULT_OG_IMAGE;
  const ogImageUrl = ogImage.startsWith("http")
    ? ogImage
    : `${SITE_URL}${ogImage}`;

  return {
    title: seo.title,
    description: seo.description,
    ...(seo.keywords &&
      seo.keywords.length > 0 && { keywords: seo.keywords }),
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE_NAME,
      type: seo.ogType ?? "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: url,
    },
    ...(seo.noIndex && { robots: { index: false, follow: true } }),
  };
}

/**
 * Truncate text to a maximum length, breaking at the last word boundary.
 * Used to keep meta descriptions within Google's ~155-character display limit.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 1).replace(/\s+\S*$/, "");
  return truncated + "\u2026";
}
