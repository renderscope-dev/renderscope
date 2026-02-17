import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { GalleryPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Render Gallery",
  description:
    "Browse standard test scenes rendered by different engines. Same camera, same lighting, different renderers.",
  path: "/gallery",
});

export default function GalleryPage() {
  return <GalleryPageContent />;
}
