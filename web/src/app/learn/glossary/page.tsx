import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { getAllGlossaryTerms } from "@/lib/learn-data";
import { GlossaryPageClient } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Rendering Glossary",
  description:
    "A searchable dictionary of rendering terms, acronyms, and concepts used across the rendering ecosystem.",
  path: "/learn/glossary",
});

export default function GlossaryPage() {
  const terms = getAllGlossaryTerms();
  return <GlossaryPageClient terms={terms} />;
}
