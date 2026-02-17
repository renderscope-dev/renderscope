import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { DocsPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Documentation",
  description:
    "RenderScope documentation. CLI reference, API docs, data schema guide, and contribution instructions.",
  path: "/docs",
});

export default function DocsPage() {
  return <DocsPageContent />;
}
