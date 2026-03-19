import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { MethodologyPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Benchmark Methodology",
  description:
    "Detailed benchmark methodology for RenderScope rendering engine comparisons. Hardware requirements, settings standardization, fairness protocol, and metric definitions.",
  path: "/docs/methodology",
  ogImage: "/og/default.png",
});

export default function MethodologyPage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "Methodology", path: "/docs/methodology" },
        ])}
      />
      <MethodologyPageContent />
    </>
  );
}
