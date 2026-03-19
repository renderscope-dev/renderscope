"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RenderCard } from "@/components/gallery/render-card";
import { ScenePlaceholder } from "@/components/gallery/scene-placeholder";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { Info } from "lucide-react";
import type { SceneData, SceneRender } from "@/types/scene";
import type { RendererData } from "@/types/renderer";

interface RenderGridProps {
  scene: SceneData;
  renders: SceneRender[];
  renderers: RendererData[];
  onRenderClick: (index: number) => void;
}

/** Maximum placeholder cards to show when no renders exist. */
const MAX_PLACEHOLDER_COUNT = 8;

export function RenderGrid({
  scene,
  renders,
  renderers,
  onRenderClick,
}: RenderGridProps) {
  const prefersReducedMotion = useReducedMotion();

  if (renders.length > 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {renders.map((render, idx) => {
          const renderer = renderers.find((r) => r.id === render.renderer_id);
          if (!renderer) return null;

          return (
            <motion.div
              key={render.renderer_id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: Math.min(idx * 0.04, 0.4),
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <RenderCard
                render={render}
                renderer={renderer}
                sceneName={scene.name}
                onClick={() => onRenderClick(idx)}
              />
            </motion.div>
          );
        })}
      </div>
    );
  }

  // ── Placeholder state ──
  const placeholderRenderers = renderers.slice(0, MAX_PLACEHOLDER_COUNT);

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3"
        )}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Benchmark renders are being prepared. These scenes will be rendered by
          each engine at standardized settings for fair comparison.
        </p>
      </div>

      {/* Placeholder grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {placeholderRenderers.map((renderer, idx) => (
          <motion.div
            key={renderer.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: Math.min(idx * 0.04, 0.4),
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-border/50 bg-card"
              )}
            >
              <div className="aspect-video w-full">
                <ScenePlaceholder
                  name={scene.name}
                  variant="render"
                  rendererName={renderer.name}
                  className="h-full w-full"
                />
              </div>
              <div className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground/70">
                    {renderer.name}
                  </span>
                  {renderer.technique[0] && (
                    <TechniqueBadge
                      technique={renderer.technique[0]}
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground/40">
                  Render pending
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
