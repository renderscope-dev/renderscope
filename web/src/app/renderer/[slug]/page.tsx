import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRendererBySlug, getAllRendererSlugs } from "@/lib/data";
import { siteConfig } from "@/lib/constants";
import { ProfileLayout } from "@/components/renderer/profile-layout";

interface RendererPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllRendererSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: RendererPageProps): Promise<Metadata> {
  const { slug } = await params;
  const renderer = getRendererBySlug(slug);

  if (!renderer) {
    return { title: "Renderer Not Found" };
  }

  const title = `${renderer.name} — Renderer Profile`;
  const description =
    renderer.description ||
    `Detailed profile, features, benchmarks, and community data for ${renderer.name}.`;

  return {
    title,
    description,
    keywords: [
      renderer.name,
      ...renderer.technique,
      renderer.language,
      "rendering engine",
      "comparison",
      ...renderer.tags.slice(0, 5),
    ],
    openGraph: {
      title: `${renderer.name} — Renderer Profile | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/renderer/${slug}/`,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${renderer.name} — Renderer Profile | ${siteConfig.name}`,
      description,
    },
    alternates: {
      canonical: `${siteConfig.url}/renderer/${slug}/`,
    },
  };
}

export default async function RendererProfilePage({
  params,
}: RendererPageProps) {
  const { slug } = await params;
  const renderer = getRendererBySlug(slug);

  if (!renderer) {
    notFound();
  }

  return <ProfileLayout renderer={renderer} />;
}
