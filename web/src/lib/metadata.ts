import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants";

export interface SEOMetadata {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}

export function generatePageMetadata(meta: SEOMetadata): Metadata {
  const url = `${siteConfig.url}${meta.path}`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: `${meta.title} | ${siteConfig.name}`,
      description: meta.description,
      url,
      siteName: siteConfig.name,
      type: "website",
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.title} | ${siteConfig.name}`,
      description: meta.description,
    },
    alternates: {
      canonical: url,
    },
  };
}
