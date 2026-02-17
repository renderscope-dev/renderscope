"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Boxes, Columns, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FeaturePreviewCard } from "@/components/feature-preview-card";

const features = [
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "Standard Scenes",
    description:
      "Cornell Box, Sponza Atrium, Stanford Bunny, and more — the classic test scenes of computer graphics.",
    accentColor: "emerald",
  },
  {
    icon: <Columns className="h-5 w-5" />,
    title: "Cross-Renderer Views",
    description:
      "Every scene rendered by multiple engines with identical camera, resolution, and sample count.",
    accentColor: "emerald",
  },
  {
    icon: <Info className="h-5 w-5" />,
    title: "Full Metadata",
    description:
      "Render time, memory usage, settings, and image quality metrics for every render.",
    accentColor: "emerald",
  },
];

const sceneNames = ["Cornell Box", "Sponza Atrium", "Stanford Bunny", "Classroom"];

export function GalleryPageContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<ImageIcon className="h-12 w-12" />}
        title="Render Gallery"
        subtitle="The same canonical scenes rendered by different engines at identical settings. See how each renderer interprets light, materials, and geometry."
        accentColor="emerald"
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

      {/* Placeholder scene image grid */}
      <motion.div
        className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {sceneNames.map((scene) => (
          <div key={scene} className="space-y-2">
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border/30 bg-card/30">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-center text-sm text-muted-foreground/60">
              {scene}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
