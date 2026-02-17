import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { BenchmarksPageContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "Benchmarks",
  description:
    "Standardized performance benchmarks for rendering engines. Render time, memory, convergence, and image quality metrics.",
  path: "/benchmarks",
});

export default function BenchmarksPage() {
  return <BenchmarksPageContent />;
}
