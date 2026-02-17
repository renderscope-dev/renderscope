import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { ComparePageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Compare Renderers",
  description:
    "Side-by-side comparison of rendering engines. Compare features, visual output, and performance benchmarks.",
  path: "/compare",
});

export default function ComparePage() {
  return <ComparePageContent />;
}
