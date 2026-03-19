"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FeatureMatrix } from "@/components/compare/feature-matrix";
import type { RendererData } from "@/types/renderer";

interface FeatureMatrixTestContentProps {
  renderers: RendererData[];
}

/** Pre-defined renderer combinations for quick testing. */
const PRESETS: Record<string, string[]> = {
  "Path Tracers": ["pbrt", "mitsuba3", "blender-cycles", "luxcorerender", "appleseed"],
  "Real-Time": ["filament", "godot", "three-js", "babylon-js", "bevy"],
  "Neural / Differentiable": [
    "3d-gaussian-splatting",
    "nerfstudio",
    "pytorch3d",
    "nvdiffrast",
    "mitsuba3",
  ],
  "Just Two": ["pbrt", "mitsuba3"],
  "All Types (5 Max)": ["pbrt", "filament", "3d-gaussian-splatting", "vtk", "pytorch3d"],
};

export function FeatureMatrixTestContent({
  renderers,
}: FeatureMatrixTestContentProps) {
  const [activePreset, setActivePreset] = useState("Path Tracers");

  const selectedRenderers = useMemo(() => {
    const ids = PRESETS[activePreset] ?? [];
    return ids
      .map((id) => renderers.find((r) => r.id === id))
      .filter((r): r is RendererData => r != null);
  }, [activePreset, renderers]);

  const handleRemoveRenderer = (id: string) => {
    // In the test page, removing is a no-op since selection is preset-driven.
    // In the real compare page, this updates URL state.
    console.log("Remove renderer:", id);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Feature Matrix &mdash; Test Page
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Development page for testing the FeatureMatrix component in
            isolation. Select a preset below or navigate to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              /compare?r=pbrt,mitsuba3&amp;tab=features
            </code>{" "}
            for the full Compare page.
          </p>
        </div>

        {/* Preset buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((preset) => (
            <Button
              key={preset}
              variant={activePreset === preset ? "default" : "outline"}
              size="sm"
              onClick={() => setActivePreset(preset)}
              className="text-xs"
            >
              {preset}
            </Button>
          ))}
        </div>

        {/* Resolved renderers info */}
        <p className="mb-4 text-xs text-muted-foreground">
          Showing {selectedRenderers.length} of{" "}
          {(PRESETS[activePreset] ?? []).length} requested renderers
          {selectedRenderers.length < (PRESETS[activePreset] ?? []).length &&
            " (some IDs not found in data)"}
        </p>

        {/* Feature Matrix */}
        <FeatureMatrix
          renderers={selectedRenderers}
          onRemoveRenderer={handleRemoveRenderer}
        />
      </motion.div>

      <div className="pb-20" />
    </div>
  );
}
