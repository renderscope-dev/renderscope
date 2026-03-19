import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { CitationPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Cite RenderScope",
  description:
    "Citation formats for RenderScope — BibTeX, CITATION.cff, and plain text. Cite the open source rendering engine comparison platform in your research.",
  path: "/docs/citation",
  ogImage: "/og/default.png",
});

export default function CitationPage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "Citation", path: "/docs/citation" },
        ])}
      />
      <CitationPageContent />
    </>
  );
}
