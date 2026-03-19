import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { SchemaPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Data Schema",
  description:
    "JSON schema documentation for RenderScope renderer metadata, benchmark results, scene definitions, and the taxonomy graph.",
  path: "/docs/schema",
  ogImage: "/og/default.png",
});

export default function SchemaPage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "Schema", path: "/docs/schema" },
        ])}
      />
      <SchemaPageContent />
    </>
  );
}
