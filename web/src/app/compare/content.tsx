"use client";

import { motion } from "framer-motion";
import { GitCompareArrows, Table, Columns, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FeaturePreviewCard } from "@/components/feature-preview-card";

const features = [
  {
    icon: <Table className="h-5 w-5" />,
    title: "Feature Matrix",
    description:
      "Interactive comparison table with grouped categories, boolean feature flags, and format support.",
    accentColor: "purple",
  },
  {
    icon: <Columns className="h-5 w-5" />,
    title: "Visual Comparison",
    description:
      "Draggable image sliders, pixel-level diff views, and SSIM heatmaps for the same scene across renderers.",
    accentColor: "purple",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Performance Benchmarks",
    description:
      "Render time, memory usage, and convergence data with interactive charts.",
    accentColor: "purple",
  },
];

const exampleChips = ["PBRT", "Mitsuba 3", "Cycles"];

export function ComparePageContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<GitCompareArrows className="h-12 w-12" />}
        title="Compare Renderers"
        subtitle="Select 2–5 rendering engines for a detailed side-by-side comparison across features, visual output, and performance."
        accentColor="purple"
        badge="Coming Soon"
      />

      {/* Feature hint cards */}
      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((feat) => (
          <FeaturePreviewCard
            key={feat.title}
            icon={feat.icon}
            title={feat.title}
            description={feat.description}
            accentColor={feat.accentColor}
          />
        ))}
      </div>

      {/* Placeholder renderer picker */}
      <motion.div
        className="mt-12"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="rounded-lg border border-border/50 bg-card/30 px-4 py-3">
          <span className="text-sm text-muted-foreground/60">
            Select renderers to compare&hellip;
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {exampleChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full border border-border/40 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground/60"
            >
              {chip}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
