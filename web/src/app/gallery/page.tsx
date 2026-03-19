import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getAllScenes } from "@/lib/scenes";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { GalleryGridContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Render Gallery",
  description:
    "See how the same scene looks when rendered by different engines. Cornell Box, Sponza, Stanford Bunny, and more — side by side at identical settings.",
  path: "/gallery",
  ogImage: "/og/gallery.png",
  keywords: [
    "render gallery",
    "rendering comparison images",
    "Cornell Box renders",
    "Sponza renders",
    "renderer output",
  ],
});

export default function GalleryPage() {
  const scenes = getAllScenes();

  const scenesWithCounts = scenes.map((scene) => ({
    scene,
    renderCount: scene.renders?.length ?? 0,
  }));

  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ])}
      />
      <GalleryGridContent scenes={scenesWithCounts} />
    </>
  );
}
