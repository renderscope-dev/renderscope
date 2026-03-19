import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getRendererBySlug,
  getAllRendererSlugs,
  getRenderersByIds,
} from "@/lib/data";
import { getBenchmarksForRenderer } from "@/lib/benchmark-data";
import { getRendererSampleImages } from "@/lib/scenes";
import { highlightCode } from "@/lib/syntax-highlight";
import { generatePageMetadata, truncate } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import {
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
} from "@/lib/structured-data";
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
    return generatePageMetadata({
      title: "Renderer Not Found",
      description: "The requested renderer could not be found.",
      path: `/renderer/${slug}`,
    });
  }

  const techniqueLabels = renderer.technique
    .map((t) =>
      t
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(", ");

  const title = `${renderer.name} — ${techniqueLabels} Renderer`;
  const description = truncate(
    `${renderer.description}. ${renderer.best_for}. Written in ${renderer.language}, licensed under ${renderer.license}.`,
    160
  );

  return generatePageMetadata({
    title,
    description,
    path: `/renderer/${renderer.id}`,
    ogImage: `/og/renderer-${renderer.id}.png`,
    keywords: [
      renderer.name,
      ...renderer.technique,
      renderer.language,
      "renderer",
      "open source",
      ...renderer.tags.slice(0, 5),
    ],
  });
}

export default async function RendererProfilePage({
  params,
}: RendererPageProps) {
  const { slug } = await params;
  const renderer = getRendererBySlug(slug);

  if (!renderer) {
    notFound();
  }

  // Resolve related renderers from IDs to full objects
  const relatedRenderers = renderer.related
    ? getRenderersByIds(renderer.related)
    : [];

  // Pre-highlight install command at build time (Shiki is async)
  const highlightedInstallHtml = renderer.install_command
    ? await highlightCode(renderer.install_command, "bash")
    : undefined;

  // Load benchmark data and scene-derived sample images for this renderer
  const benchmarks = getBenchmarksForRenderer(renderer.id);
  const sceneSampleImages = getRendererSampleImages(renderer.id);

  return (
    <>
      <JsonLd data={generateSoftwareApplicationSchema(renderer)} />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
          { name: renderer.name, path: `/renderer/${renderer.id}` },
        ])}
      />
      <ProfileLayout
        renderer={renderer}
        relatedRenderers={relatedRenderers}
        highlightedInstallHtml={highlightedInstallHtml}
        benchmarks={benchmarks}
        sceneSampleImages={sceneSampleImages}
      />
    </>
  );
}
