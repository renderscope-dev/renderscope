"use client";

import { cn } from "@/lib/utils";
import {
  heroPlaceholderImages,
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
  volume: "Volume",
  hybrid: "Hybrid",
  "path-tracing": "Path Tracing",
};

/** Map technique IDs to strong, visible gradient classes.
 *  Full opacity for rich, saturated placeholder cards. */
const TECHNIQUE_GRADIENTS: Record<string, string> = {
  "path-tracing": "from-blue-500 via-indigo-600 to-blue-800",
  path_tracing: "from-blue-500 via-indigo-600 to-blue-800",
  rasterization: "from-emerald-500 via-teal-600 to-emerald-800",
  neural: "from-purple-500 via-violet-600 to-purple-800",
  differentiable: "from-rose-400 via-pink-600 to-fuchsia-800",
  volume: "from-amber-400 via-orange-500 to-red-700",
  "gaussian-splatting": "from-violet-400 via-purple-600 to-indigo-800",
  "ray-marching": "from-cyan-400 via-teal-600 to-cyan-800",
  educational: "from-amber-400 via-yellow-500 to-orange-700",
};

/** Map snake_case technique IDs to kebab-case gradient keys. */
function toGradientKey(technique: string): string {
  return technique.replace(/_/g, "-");
}

/**
 * Horizontal row of render image cards — full-width, edge-to-edge feeling.
 * Shows 5 cards on desktop, 3 on tablet, 2 on mobile.
 * The center card is slightly taller for visual interest.
 */
export function HeroImageGrid({ className, images }: HeroImageGridProps) {
  // Build 5 items from real images + placeholder fallbacks
  const gridItems: HeroGridImage[] = [];
  if (images && images.length > 0) {
    gridItems.push(...images.slice(0, 5));
  }
  while (gridItems.length < 5) {
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
    <div className={cn("relative w-full", className)}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-3">
        {gridItems.map((img, i) => {
          const gradientKey = toGradientKey(img.technique);
          const gradient =
            TECHNIQUE_GRADIENTS[gradientKey] ??
            TECHNIQUE_GRADIENTS[img.technique] ??
            TECHNIQUE_GRADIENTS["path-tracing"]!;
          const label = img.label || TECHNIQUE_LABELS[img.technique] || TECHNIQUE_LABELS[gradientKey] || img.technique;
          const hasRealImage = !!img.src;
          const isFeatured = i === 2;

          return (
            <div
              key={`${img.renderer}-${i}`}
              className={cn(
                "group relative overflow-hidden rounded-xl shadow-md",
                "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                isFeatured ? "aspect-[4/3]" : "aspect-[3/2]",
                // Responsive visibility
                i >= 3 && "hidden lg:block",
                i >= 2 && i < 3 && "hidden sm:block",
              )}
            >
              {hasRealImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={img.src}
                  alt={`${img.renderer} render`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={i < 3 ? "eager" : "lazy"}
                  fetchPriority={isFeatured ? "high" : undefined}
                  decoding={i < 3 ? "sync" : "async"}
                />
              ) : (
                <>
                  {/* Base gradient — full saturation */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
                  {/* Radial light spot for depth */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 60% 50% at 30% 30%, rgba(255,255,255,0.25) 0%, transparent 70%)",
                    }}
                  />
                  {/* Noise texture */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: noiseSvg, backgroundSize: "256px" }}
                  />
                  {/* Wireframe grid pattern — evokes 3D rendering */}
                  <div
                    className="absolute inset-0 opacity-[0.1]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                </>
              )}

              {/* Renderer label */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2.5 pt-8">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                  {label}
                </p>
                <p className="text-xs font-semibold text-white/90 sm:text-sm">
                  {img.renderer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
