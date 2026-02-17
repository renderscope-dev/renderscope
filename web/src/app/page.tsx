import type { Metadata } from "next";
import { HomePageContent } from "./home-content";

export const metadata: Metadata = {
  title: {
    absolute:
      "RenderScope — Catalog, Compare & Benchmark Rendering Engines",
  },
  description:
    "The open source platform for cataloging, comparing, and benchmarking 50+ rendering engines. From path tracers to neural renderers.",
};

export default function HomePage() {
  return <HomePageContent />;
}
