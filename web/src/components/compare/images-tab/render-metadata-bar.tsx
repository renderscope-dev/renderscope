"use client";

import { Clock, Grid2X2, Aperture } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenderImageMeta } from "@/lib/compare-images";

interface RenderMetadataBarProps {
  images: RenderImageMeta[];
  isPlaceholder: boolean;
  className?: string;
}

/**
 * Horizontal row of compact metadata cards, one per displayed renderer.
 * Shows render time, resolution, samples, and integrator for each image.
 */
export function RenderMetadataBar({
  images,
  isPlaceholder,
  className,
}: RenderMetadataBarProps) {
  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-3",
        images.length <= 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      {images.map((img) => (
        <div
          key={img.rendererId}
          className={cn(
            "flex flex-col gap-1.5 rounded-lg border border-border/40 bg-card/50 px-3.5 py-2.5",
            "transition-colors"
          )}
        >
          {/* Renderer name + placeholder indicator */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {img.rendererName}
            </span>
            {isPlaceholder && (
              <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Sample
              </span>
            )}
          </div>

          {/* Metadata grid */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <MetadataItem
              icon={Clock}
              label={`${img.renderTimeSeconds.toFixed(1)}s`}
            />
            <MetadataItem
              icon={Grid2X2}
              label={`${img.settings.resolution[0]}×${img.settings.resolution[1]}`}
            />
            <MetadataItem
              icon={Aperture}
              label={`${img.settings.samplesPerPixel} spp`}
            />
            {img.settings.integrator && (
              <span className="text-muted-foreground">
                {img.settings.integrator}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetadataItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3 shrink-0 opacity-60" />
      {label}
    </span>
  );
}
