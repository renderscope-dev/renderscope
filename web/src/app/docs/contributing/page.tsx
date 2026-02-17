import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { ContributingPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Contributing",
  description:
    "How to contribute to RenderScope. Add renderers, submit benchmarks, report issues, and contribute code.",
  path: "/docs/contributing",
});

export default function ContributingPage() {
  return <ContributingPageContent />;
}
