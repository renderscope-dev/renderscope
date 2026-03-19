"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  Home,
  ExternalLink,
  ArrowRight,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SceneMetadata } from "@/components/gallery/scene-metadata";
import { TestTags } from "@/components/gallery/test-tags";
import { RenderGrid } from "@/components/gallery/render-grid";
import { sceneFormatLabels } from "@/lib/constants";
import type { SceneData, SceneRender } from "@/types/scene";
import type { RendererData } from "@/types/renderer";

// Lazy-load the lightbox to avoid loading it on initial page render
const GalleryLightbox = dynamic(
  () =>
    import("@/components/gallery/gallery-lightbox").then(
      (m) => m.GalleryLightbox
    ),
  { ssr: false }
);

interface SceneDetailContentProps {
  scene: SceneData;
  renderers: RendererData[];
}

export function SceneDetailContent({
  scene,
  renderers,
}: SceneDetailContentProps) {
  const prefersReducedMotion = useReducedMotion();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const renders = scene.renders ?? [];

  // Build lightbox entries from renders with matching renderer data
  const lightboxEntries = renders
    .map((render) => {
      const renderer = renderers.find((r) => r.id === render.renderer_id);
      if (!renderer) return null;
      return { render, renderer };
    })
    .filter(
      (entry): entry is { render: SceneRender; renderer: RendererData } =>
        entry !== null
    );

  const handleRenderClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Build renderer IDs for compare link
  const rendererIds = renders
    .map((r) => r.renderer_id)
    .slice(0, 5)
    .join(",");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <motion.nav
        aria-label="Breadcrumb"
        className="mb-8"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              href="/"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          </li>
          <li>
            <Link
              href="/gallery"
              className="transition-colors hover:text-foreground"
            >
              Gallery
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          </li>
          <li className="text-foreground font-medium" aria-current="page">
            {scene.name}
          </li>
        </ol>
      </motion.nav>

      {/* Scene header */}
      <motion.header
        className="mb-10 space-y-6"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {scene.name}
        </h1>

        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {scene.description}
        </p>

        {/* Metadata */}
        <SceneMetadata scene={scene} />

        {/* Test tags */}
        <TestTags tests={scene.tests} />

        {/* Source attribution */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Source:</span>
          <a
            href={scene.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
          >
            {scene.source}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </motion.header>

      {/* Render grid section */}
      <motion.section
        className="mb-12"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <h2 className="mb-6 text-xl font-semibold text-foreground">
          Renderer Outputs
        </h2>
        <RenderGrid
          scene={scene}
          renders={renders}
          renderers={renderers}
          onRenderClick={handleRenderClick}
        />
      </motion.section>

      {/* Compare CTA */}
      <motion.section
        className="mb-12"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {renders.length >= 2 ? (
          <Link
            href={`/compare?r=${rendererIds}&tab=images`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-3",
              "border border-primary/20 bg-primary/5 text-sm font-medium text-primary",
              "transition-colors hover:bg-primary/10"
            )}
          >
            Compare these renderers side by side
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="rounded-lg border border-border/50 bg-muted/20 px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Benchmark renders are coming soon &mdash; comparison will be
              available once multiple renderers have completed this scene.
            </p>
          </div>
        )}
      </motion.section>

      {/* Available formats */}
      {scene.available_formats.length > 0 && (
        <motion.section
          className="mb-12"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Available Formats
          </h2>
          <div className="flex flex-wrap gap-2">
            {scene.available_formats.map((format) => (
              <span
                key={format}
                className={cn(
                  "inline-flex items-center rounded-full border border-border/50 px-3 py-1",
                  "text-xs font-medium text-muted-foreground bg-muted/30"
                )}
              >
                {sceneFormatLabels[format] ?? format.toUpperCase()}
              </span>
            ))}
          </div>
          {scene.source_url && (
            <a
              href={scene.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
            >
              <FileDown className="h-3.5 w-3.5" />
              Download scene files
            </a>
          )}
        </motion.section>
      )}

      {/* Lightbox */}
      {lightboxEntries.length > 0 && (
        <GalleryLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          renders={lightboxEntries}
          initialIndex={lightboxIndex}
          sceneName={scene.name}
        />
      )}
    </div>
  );
}
