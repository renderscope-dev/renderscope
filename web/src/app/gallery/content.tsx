"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import { SceneCard } from "@/components/gallery/scene-card";
import type { SceneData } from "@/types/scene";

interface GalleryGridContentProps {
  scenes: Array<{ scene: SceneData; renderCount: number }>;
}

export function GalleryGridContent({ scenes }: GalleryGridContentProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Page header */}
      <motion.div
        className="mb-12 text-center"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="mb-4 text-emerald-500/60">
          <ImageIcon className="mx-auto h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Gallery
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Explore the same scenes rendered by different engines &mdash; see how
          path tracers, rasterizers, and neural renderers interpret identical
          geometry and lighting.
        </p>
        <div className="mt-4 h-px w-12 mx-auto bg-gradient-to-r from-emerald-500 to-emerald-400" />
        <p className="mt-6 text-sm text-muted-foreground">
          {scenes.length} standard scene{scenes.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Scene grid */}
      {scenes.length > 0 ? (
        <div data-testid="scene-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map(({ scene, renderCount }, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              renderCount={renderCount}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-lg font-medium text-muted-foreground">
            Standard benchmark scenes are being prepared.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
