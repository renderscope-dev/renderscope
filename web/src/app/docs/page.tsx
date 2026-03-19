import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { DocsPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Documentation",
  description:
    "Getting started guides, CLI reference, API docs, and contribution guidelines for RenderScope.",
  path: "/docs",
  ogImage: "/og/default.png",
});

export default function DocsPage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
        ])}
      />
      <DocsPageContent />
    </>
  );
}
