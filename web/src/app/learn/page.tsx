import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { getAllTechniques } from "@/lib/learn-data";
import { LearnOverview } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Learn",
  description:
    "Understand the rendering landscape. Explainers for path tracing, rasterization, neural rendering, and more.",
  path: "/learn",
});

export default function LearnPage() {
  const techniques = getAllTechniques();
  return <LearnOverview techniques={techniques} />;
}
