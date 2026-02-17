"use client";

import { motion } from "framer-motion";
import { BarChart3, Timer, Focus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FeaturePreviewCard } from "@/components/feature-preview-card";

const features = [
  {
    icon: <Timer className="h-5 w-5" />,
    title: "Render Performance",
    description:
      "Wall-clock render times and peak memory usage across standardized scenes and settings.",
    accentColor: "orange",
  },
  {
    icon: <Focus className="h-5 w-5" />,
    title: "Image Quality",
    description:
      "PSNR, SSIM, and LPIPS scores measured against high-sample-count reference renders.",
    accentColor: "orange",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Convergence Analysis",
    description:
      "For progressive renderers: quality-over-time curves showing how fast each engine converges.",
    accentColor: "orange",
  },
];

const barData = [
  { label: "PBRT", height: 72 },
  { label: "Mitsuba 3", height: 58 },
  { label: "Cycles", height: 85 },
  { label: "LuxCore", height: 64 },
  { label: "appleseed", height: 78 },
];

export function BenchmarksPageContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<BarChart3 className="h-12 w-12" />}
        title="Benchmarks"
        subtitle="Transparent, reproducible performance data. Render time, peak memory, convergence rates, and image quality metrics — all with full hardware context."
        accentColor="orange"
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

      {/* Decorative placeholder bar chart */}
      <motion.div
        className="mt-12 rounded-xl border border-border/30 bg-card/30 p-8"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="mb-6 text-xs text-muted-foreground/50">
          Render Time (s)
        </p>
        <div className="flex items-end justify-between gap-3">
          {barData.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-orange-500/30 to-orange-500/10"
                style={{ height: `${bar.height}px` }}
              />
              <span className="text-xs text-muted-foreground/50">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
