import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { APIReferenceContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "API Reference",
  description:
    "Component API documentation for the renderscope-ui npm package.",
  path: "/docs/api",
});

export default function APIReferencePage() {
  return <APIReferenceContent />;
}
