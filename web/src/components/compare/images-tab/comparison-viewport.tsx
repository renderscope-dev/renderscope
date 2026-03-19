"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ImageCompareSlider,
} from "@/components/image-compare/image-compare-slider";
import { ImageDiff } from "@/components/image-compare/image-diff";
import { ImageSSIMHeatmap } from "@/components/image-compare/image-ssim-heatmap";
import { ImageToggle } from "@/components/image-compare/image-toggle";
import { RegionZoom } from "@/components/image-compare/region-zoom";
import {
  type CompareMode,
  type RenderImageMeta,
  getPairImagesForAnalysis,
  toComparisonImage,
} from "@/lib/compare-images";

interface ComparisonViewportProps {
  mode: CompareMode;
  /** All resolved render images (for multi-image modes) */
  allImages: RenderImageMeta[];
  /** Selected pair (for pairwise modes) — null when in multi mode */
  pairImages: [RenderImageMeta, RenderImageMeta] | null;
  /** Whether the images are placeholders */
  isPlaceholder: boolean;
  className?: string;
}

/**
 * Renders the active Phase 10 comparison component based on the
 * current mode. Uses AnimatePresence for smooth transitions.
 */
export function ComparisonViewport({
  mode,
  allImages,
  pairImages,
  isPlaceholder,
  className,
}: ComparisonViewportProps) {
  // For pair modes using pixel analysis, substitute raster images if needed
  const analysisPair = useMemo(() => {
    if (!pairImages) return null;
    if (mode === "diff" || mode === "heatmap") {
      return getPairImagesForAnalysis(pairImages);
    }
    return pairImages;
  }, [pairImages, mode]);

  // No images available
  if (allImages.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/10",
          className
        )}
      >
        <div className="text-center">
          <ImageOff className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No render images available for this scene.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ViewportContent
            mode={mode}
            allImages={allImages}
            pairImages={analysisPair}
            isPlaceholder={isPlaceholder}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Inner content (no AnimatePresence key) ───────────────────

function ViewportContent({
  mode,
  allImages,
  pairImages,
  isPlaceholder,
}: {
  mode: CompareMode;
  allImages: RenderImageMeta[];
  pairImages: [RenderImageMeta, RenderImageMeta] | null;
  isPlaceholder: boolean;
}) {
  switch (mode) {
    case "slider": {
      if (!pairImages) return <ViewportSkeleton />;
      const left = toComparisonImage(pairImages[0]);
      const right = toComparisonImage(pairImages[1]);
      return (
        <ImageCompareSlider
          left={{
            src: left.src,
            label: left.label,
            metadata: left.metadata,
          }}
          right={{
            src: right.src,
            label: right.label,
            metadata: right.metadata,
          }}
          showLabels
          showMetadata={!isPlaceholder}
        />
      );
    }

    case "diff": {
      if (!pairImages) return <ViewportSkeleton />;
      return (
        <ImageDiff
          reference={pairImages[0].src}
          test={pairImages[1].src}
          mode="absolute"
          amplification={5}
          showMetrics
        />
      );
    }

    case "heatmap": {
      if (!pairImages) return <ViewportSkeleton />;
      return (
        <ImageSSIMHeatmap
          reference={pairImages[0].src}
          test={pairImages[1].src}
          colorMap="viridis"
        />
      );
    }

    case "toggle": {
      const toggleImages = allImages.map(toComparisonImage);
      return (
        <ImageToggle
          images={toggleImages}
          showLabel
          interval={0}
        />
      );
    }

    case "zoom": {
      const zoomImages = allImages.map(toComparisonImage);
      return (
        <RegionZoom
          images={zoomImages}
          zoomLevel={4}
        />
      );
    }
  }
}

function ViewportSkeleton() {
  return (
    <Skeleton className="aspect-video w-full rounded-lg" />
  );
}
