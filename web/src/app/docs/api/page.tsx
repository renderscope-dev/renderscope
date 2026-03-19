import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { APIReferenceContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Component API Reference",
  description:
    "API documentation for renderscope-ui React components. Image comparison, feature matrices, charts, and taxonomy graphs.",
  path: "/docs/api",
  ogImage: "/og/default.png",
});

export default function APIReferencePage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "API Reference", path: "/docs/api" },
        ])}
      />
      <APIReferenceContent />
    </>
  );
}
