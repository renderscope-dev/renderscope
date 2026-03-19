"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ComplexityBadge } from "@/components/gallery/complexity-badge";
import { TestTags } from "@/components/gallery/test-tags";
import { ScenePlaceholder } from "@/components/gallery/scene-placeholder";
import type { SceneData } from "@/types/scene";

interface SceneCardProps {
  scene: SceneData;
  renderCount: number;
  index: number;
}

export function SceneCard({ scene, renderCount, index }: SceneCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const truncatedDescription =
    scene.description.length > 100
      ? scene.description.slice(0, 100).trimEnd() + "\u2026"
      : scene.description;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Link
        href={`/gallery/${scene.id}`}
        className="group block h-full"
        aria-label={`View ${scene.name} renders`}
      >
        <article
          className={cn(
            "relative h-full overflow-hidden rounded-xl border bg-card",
            "transition-all duration-300 ease-out",
            "hover:border-primary/20",
            "hover:shadow-lg hover:shadow-primary/5",
            "hover:-translate-y-0.5",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          )}
        >
          {/* Thumbnail */}
          <div className="aspect-video w-full overflow-hidden">
            {scene.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scene.thumbnail}
                alt={`${scene.name} \u2013 reference render`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <ScenePlaceholder
                name={scene.name}
                variant="scene"
                className="h-full w-full"
              />
            )}
          </div>

          {/* Content */}
          <div className="space-y-2.5 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                {scene.name}
              </h3>
              <ComplexityBadge complexity={scene.complexity} />
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {truncatedDescription}
            </p>

            <TestTags tests={scene.tests} limit={3} />

            <div className="border-t border-border/50 pt-2">
              {renderCount > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {renderCount} renderer{renderCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Renders coming soon
                </span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
