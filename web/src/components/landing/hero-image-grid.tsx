"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  heroPlaceholderImages,
  techniquePlaceholderGradients,
} from "@/lib/constants";

/** A render image with real src or placeholder data. */
export interface HeroGridImage {
  src?: string;
  renderer: string;
  technique: string;
  label: string;
}

interface HeroImageGridProps {
  className?: string;
  images?: HeroGridImage[];
}

/**
 * A noise texture SVG data URI — small, inline, adds visual depth to placeholders.
 */
const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

/** Map rendering technique IDs to display labels. */
const TECHNIQUE_LABELS: Record<string, string> = {
  path_tracing: "Path Tracing",
  ray_tracing: "Ray Tracing",
  rasterization: "Rasterization",
  neural: "Neural",
  gaussian_splatting: "Gaussian Splatting",
  differentiable: "Differentiable",
  volume_rendering: "Volume",
  hybrid: "Hybrid",
};

/** Map snake_case technique IDs to kebab-case gradient keys. */
function toGradientKey(technique: string): string {
  return technique.replace(/_/g, "-");
}

export function HeroImageGrid({ className, images }: HeroImageGridProps) {
  const reduced = useReducedMotion();

  // Merge real images with placeholder fallbacks to always have 6 items
  const gridItems: HeroGridImage[] = [];
  if (images && images.length > 0) {
    gridItems.push(...images);
  }
  // Fill remaining slots with placeholders
  while (gridItems.length < 6) {
    const placeholder = heroPlaceholderImages[gridItems.length];
    if (placeholder) {
      gridItems.push({
        renderer: placeholder.renderer,
        technique: placeholder.technique,
        label: placeholder.label,
      });
    } else {
      break;
    }
  }

  return (
    <motion.div
      className={cn("relative w-full", className)}
      initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
      animate={reduced ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Asymmetric grid: 3 columns, 2 rows, with varying spans */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:gap-4">
        {gridItems.map((img, i) => {
          const gradientKey = toGradientKey(img.technique);
          const gradient =
            techniquePlaceholderGradients[gradientKey] ??
            techniquePlaceholderGradients["path-tracing"]!;
          const label = img.label || TECHNIQUE_LABELS[img.technique] || img.technique;
          // First and last images span 2 rows for visual interest
          const isLarge = i === 0 || i === 5;
          const hasRealImage = !!img.src;

          return (
            <div
              key={`${img.renderer}-${i}`}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border/30",
                "transition-[filter] duration-300 hover:brightness-110",
                isLarge
                  ? "row-span-2 hidden sm:block"
                  : "aspect-[4/3]",
                // On mobile (2-col), hide last two items to fit nicely
                i >= 4 && "hidden sm:block"
              )}
              style={isLarge ? { minHeight: "100%" } : undefined}
            >
              {hasRealImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={img.src}
                  alt={`${img.renderer} render`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={i < 4 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding={i < 4 ? "sync" : "async"}
                />
              ) : (
                <>
                  {/* Gradient background */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      gradient
                    )}
                  />
                  {/* Noise texture overlay */}
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{ backgroundImage: noiseSvg, backgroundSize: "256px" }}
                  />
                  {/* Subtle inner grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />
                </>
              )}

              {/* Renderer label */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 sm:p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 sm:text-xs">
                  {label}
                </p>
                <p className="text-xs font-semibold text-white/60 sm:text-sm">
                  {img.renderer}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom gradient fade into page background */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent sm:h-32" />
    </motion.div>
  );
}
