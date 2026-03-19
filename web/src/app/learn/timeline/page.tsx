import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";
import { getTimelineRenderers } from "@/lib/learn-data";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { TimelinePageClient } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Renderer Timeline",
  description:
    "An interactive visual timeline showing when each open source rendering engine was first released.",
  path: "/learn/timeline",
  ogImage: "/og/learn.png",
  keywords: [
    "renderer history",
    "rendering engine timeline",
    "computer graphics history",
  ],
});

export default function TimelinePage() {
  const renderers = getTimelineRenderers();
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
          { name: "Timeline", path: "/learn/timeline" },
        ])}
      />
      <TimelinePageClient renderers={renderers} />
    </>
  );
}
