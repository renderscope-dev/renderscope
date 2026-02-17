"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const codeExample = `import { ImageCompareSlider } from 'renderscope-ui';

<ImageCompareSlider
  left={{ src: "/renders/cornell-box/pbrt.webp", label: "PBRT v4" }}
  right={{ src: "/renders/cornell-box/mitsuba3.webp", label: "Mitsuba 3" }}
/>`;

const componentList = [
  "ImageCompareSlider",
  "ImageDiffViewer",
  "FeatureMatrix",
  "BenchmarkChart",
  "TaxonomyGraph",
];

export function APIReferenceContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Code className="h-12 w-12" />}
        title="API Reference"
        subtitle="Props, types, and usage examples for every component in the renderscope-ui package."
        accentColor="sky"
        badge="Coming Soon"
      />

      {/* Code example block */}
      <motion.div
        className="mt-12 overflow-hidden rounded-lg border border-border/50 bg-black/50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2.5">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm text-foreground/90">
          {codeExample}
        </pre>
      </motion.div>

      {/* Component list preview */}
      <motion.div
        className="mt-8 rounded-xl border border-border/50 bg-card/50 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
          Components
        </h3>
        <ul className="space-y-2">
          {componentList.map((comp) => (
            <li
              key={comp}
              className="text-sm font-mono text-muted-foreground/60"
            >
              {comp}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Back link */}
      <div className="mt-12">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Docs
        </Link>
      </div>
    </div>
  );
}
