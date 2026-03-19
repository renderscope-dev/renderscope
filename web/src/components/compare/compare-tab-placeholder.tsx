"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Images, BarChart3 } from "lucide-react";
import type { CompareTab } from "@/lib/compare-url-state";
import type { RendererData } from "@/types/renderer";

interface CompareTabPlaceholderProps {
  tab: CompareTab;
  selectedRenderers: RendererData[];
}

const TAB_CONFIG: Record<
  CompareTab,
  { icon: React.ReactNode; heading: string }
> = {
  features: {
    icon: <LayoutGrid className="h-10 w-10" />,
    heading: "Feature Comparison",
  },
  images: {
    icon: <Images className="h-10 w-10" />,
    heading: "Image Comparison",
  },
  performance: {
    icon: <BarChart3 className="h-10 w-10" />,
    heading: "Performance Benchmarks",
  },
};

/**
 * Temporary placeholder for each tab's content area.
 * Shows a polished "coming soon" state with the renderer names.
 * Will be replaced by real components in Sessions 11.2–11.4.
 */
export function CompareTabPlaceholder({
  tab,
  selectedRenderers,
}: CompareTabPlaceholderProps) {
  const config = TAB_CONFIG[tab];

  const rendererNames = selectedRenderers.map((r) => r.name);
  const namesText =
    rendererNames.length <= 2
      ? rendererNames.join(" and ")
      : `${rendererNames.slice(0, -1).join(", ")}, and ${rendererNames[rendererNames.length - 1]}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      role="tabpanel"
      id={`tabpanel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      className="flex min-h-[400px] items-center justify-center"
    >
      <div className="mx-auto max-w-md rounded-xl border-2 border-dashed border-border/40 px-8 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/40">
          {config.icon}
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          {config.heading}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Coming in the next session &mdash; comparing {namesText}.
        </p>
      </div>
    </motion.div>
  );
}
