"use client";

import { cn, formatRenderTime } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { ScenePlaceholder } from "@/components/gallery/scene-placeholder";
import { Maximize2 } from "lucide-react";
import type { SceneRender } from "@/types/scene";
import type { RendererData } from "@/types/renderer";

interface RenderCardProps {
  render: SceneRender;
  renderer: RendererData;
  sceneName: string;
  onClick: () => void;
}

export function RenderCard({
  render,
  renderer,
  sceneName,
  onClick,
}: RenderCardProps) {
  const hasImage = !!render.image_thumb;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-card text-left",
        "cursor-pointer transition-all duration-300 ease-out",
        "hover:border-primary/20",
        "hover:shadow-lg hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={`${renderer.name} render of ${sceneName}. Click to view full size.`}
    >
      {/* Image area */}
      <div className="relative aspect-video w-full overflow-hidden">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={render.image_thumb!}
              alt={`${sceneName} rendered by ${renderer.name}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
              <Maximize2 className="h-6 w-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </div>
          </>
        ) : (
          <ScenePlaceholder
            name={sceneName}
            variant="render"
            rendererName={renderer.name}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Info bar */}
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-sm text-foreground">
            {renderer.name}
          </span>
          {renderer.technique[0] && (
            <TechniqueBadge technique={renderer.technique[0]} size="sm" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">
            {formatRenderTime(render.render_time_seconds)}
          </span>
          {render.samples_per_pixel !== null &&
            render.samples_per_pixel !== undefined && (
              <span className="text-muted-foreground/50">
                {render.samples_per_pixel.toLocaleString()} spp
              </span>
            )}
        </div>
      </div>
    </button>
  );
}
