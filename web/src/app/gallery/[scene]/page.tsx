import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSceneById, getSceneSlugs } from "@/lib/scenes";
import { getAllRenderers } from "@/lib/data";
import { siteConfig } from "@/lib/constants";
import { SceneDetailContent } from "./content";

interface ScenePageProps {
  params: Promise<{ scene: string }>;
}

export function generateStaticParams() {
  return getSceneSlugs().map((scene) => ({ scene }));
}

export async function generateMetadata({
  params,
}: ScenePageProps): Promise<Metadata> {
  const { scene: sceneSlug } = await params;
  const scene = getSceneById(sceneSlug);

  if (!scene) {
    return { title: "Scene Not Found" };
  }

  const title = `${scene.name} \u2013 Gallery`;
  const description = scene.description;

  return {
    title,
    description,
    openGraph: {
      title: `${scene.name} \u2013 Gallery | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/gallery/${sceneSlug}`,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${scene.name} \u2013 Gallery | ${siteConfig.name}`,
      description,
    },
    alternates: {
      canonical: `${siteConfig.url}/gallery/${sceneSlug}`,
    },
  };
}

export default async function SceneDetailPage({ params }: ScenePageProps) {
  const { scene: sceneSlug } = await params;
  const scene = getSceneById(sceneSlug);

  if (!scene) {
    notFound();
  }

  const renderers = getAllRenderers();

  return (
    <SceneDetailContent
      scene={scene}
      renderers={renderers}
    />
  );
}
