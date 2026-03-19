import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { ContributingPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Contributing Guide",
  description:
    "How to contribute to RenderScope: adding renderers, submitting benchmarks, reporting issues, and development setup.",
  path: "/docs/contributing",
  ogImage: "/og/default.png",
  noIndex: true,
});

export default function ContributingPage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "Contributing", path: "/docs/contributing" },
        ])}
      />
      <ContributingPageContent />
    </>
  );
}
