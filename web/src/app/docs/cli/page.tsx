import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { CLIReferenceContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "CLI Reference",
  description:
    "Complete command reference for the RenderScope Python CLI. Installation, benchmarking, scene management, and image metrics.",
  path: "/docs/cli",
  ogImage: "/og/default.png",
});

export default function CLIReferencePage() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "CLI Reference", path: "/docs/cli" },
        ])}
      />
      <CLIReferenceContent />
    </>
  );
}
