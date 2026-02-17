"use client";

import { cn } from "@/lib/utils";
import { techniqueColorMap } from "@/lib/constants";
import type { RenderingTechnique } from "@/types/renderer";
import { Box } from "lucide-react";

interface RendererThumbnailProps {
  techniques: RenderingTechnique[];
  thumbnail?: string;
  alt: string;
  className?: string;
}

export function RendererThumbnail({
  techniques,
  thumbnail,
  alt,
  className,
}: RendererThumbnailProps) {
  if (thumbnail) {
    return (
      <div className={cn("relative overflow-hidden bg-card", className)}>
        <img
          src={thumbnail}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  const primaryTechnique = techniques[0] ?? "path_tracing";
  const secondaryTechnique = techniques[1] ?? primaryTechnique;
  const colorKey1 =
    techniqueColorMap[primaryTechnique] ?? "technique-path-tracing";
  const colorKey2 =
    techniqueColorMap[secondaryTechnique] ?? colorKey1;

  return (
    <div
      className={cn(
        "relative overflow-hidden flex items-center justify-center",
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(var(--${colorKey1}) / 0.15) 0%, hsl(var(--background)) 50%, hsl(var(--${colorKey2}) / 0.1) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <Box className="h-8 w-8 text-muted-foreground/20" strokeWidth={1} />
    </div>
  );
}
