import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getAllTechniques } from "@/lib/learn-data";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { LearnOverview } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Learn Rendering Techniques",
  description:
    "Understand the core techniques behind modern rendering: path tracing, rasterization, neural radiance fields, Gaussian splatting, volume rendering, and more.",
  path: "/learn",
  ogImage: "/og/learn.png",
  keywords: [
    "rendering techniques",
    "path tracing explained",
    "ray tracing tutorial",
    "neural rendering",
    "volume rendering",
  ],
});

export default function LearnPage() {
  const techniques = getAllTechniques();
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
        ])}
      />
      <LearnOverview techniques={techniques} />
    </>
  );
}
