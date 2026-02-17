import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { getTimelineRenderers } from "@/lib/learn-data";
import { TimelinePageClient } from "@/components/learn";

export const metadata: Metadata = generatePageMetadata({
  title: "Renderer Timeline",
  description:
    "An interactive visual timeline showing when each open source rendering engine was first released.",
  path: "/learn/timeline",
});

export default function TimelinePage() {
  const renderers = getTimelineRenderers();
  return <TimelinePageClient renderers={renderers} />;
}
