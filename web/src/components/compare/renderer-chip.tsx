"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { techniqueColorMap } from "@/lib/constants";
import type { RendererData } from "@/types/renderer";

interface RendererChipProps {
  renderer: RendererData;
  onRemove: () => void;
}

/**
 * A removable pill-shaped chip representing a selected renderer.
 * Shows the renderer name with a technique-colored left accent.
 * Animates in/out with Framer Motion for smooth visual feedback.
 */
export function RendererChip({ renderer, onRemove }: RendererChipProps) {
  const primaryTechnique = renderer.technique[0] ?? "path_tracing";
  const colorKey =
    techniqueColorMap[primaryTechnique] ?? "technique-path-tracing";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-lg py-1.5 pl-3 pr-2",
        "border border-border/60 bg-card/80 transition-colors duration-150",
        "hover:bg-card"
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: `hsl(var(--${colorKey}))`,
      }}
    >
      <span className="text-sm font-medium text-foreground">
        {renderer.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-md",
          "text-muted-foreground/60 transition-colors duration-150",
          "hover:bg-destructive/15 hover:text-destructive",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label={`Remove ${renderer.name} from comparison`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
