"use client";

import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxonomyControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  className?: string;
}

/**
 * Overlay zoom controls for the taxonomy graph.
 * Positioned in the bottom-right of the graph container.
 */
export function TaxonomyControls({
  onZoomIn,
  onZoomOut,
  onFitToView,
  className,
}: TaxonomyControlsProps) {
  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 z-40",
        "flex flex-col gap-1",
        "rounded-lg border bg-card/90 backdrop-blur-sm shadow-lg p-1",
        className
      )}
    >
      <ControlButton
        onClick={onZoomIn}
        label="Zoom in"
        icon={<ZoomIn className="h-4 w-4" />}
      />
      <ControlButton
        onClick={onZoomOut}
        label="Zoom out"
        icon={<ZoomOut className="h-4 w-4" />}
      />
      <div className="mx-1 border-t border-border" />
      <ControlButton
        onClick={onFitToView}
        label="Fit to view"
        icon={<Maximize2 className="h-4 w-4" />}
      />
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md",
        "text-muted-foreground transition-colors duration-150",
        "hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {icon}
    </button>
  );
}
