import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getAllGlossaryTerms } from "@/lib/learn-data";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { GlossaryPageClient } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Rendering Glossary",
  description:
    "A searchable dictionary of rendering terms, acronyms, and concepts used across the rendering ecosystem.",
  path: "/learn/glossary",
  ogImage: "/og/learn.png",
  keywords: [
    "rendering glossary",
    "computer graphics terms",
    "BSDF",
    "BVH",
    "path tracing glossary",
  ],
});

export default function GlossaryPage() {
  const terms = getAllGlossaryTerms();
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
          { name: "Glossary", path: "/learn/glossary" },
        ])}
      />
      <GlossaryPageClient terms={terms} />
    </>
  );
}
