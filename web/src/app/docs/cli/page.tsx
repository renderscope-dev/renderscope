import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/metadata";
import { CLIReferenceContent } from "./content";

export const metadata: Metadata = generatePageMetadata({
  title: "CLI Reference",
  description:
    "Complete reference for the renderscope CLI tool. Commands, flags, and usage examples.",
  path: "/docs/cli",
});

export default function CLIReferencePage() {
  return <CLIReferenceContent />;
}
