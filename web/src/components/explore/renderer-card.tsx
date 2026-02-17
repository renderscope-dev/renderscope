"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { StarRating } from "@/components/shared/star-rating";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { RendererThumbnail } from "@/components/shared/renderer-thumbnail";
import type { RendererCardData, RenderingTechnique } from "@/types/renderer";
import { Code2 } from "lucide-react";

interface RendererCardProps {
  renderer: RendererCardData;
  index: number;
  maxStars?: number;
}

export function RendererCard({ renderer, index, maxStars }: RendererCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.5),
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Link href={`/renderer/${renderer.id}`} className="group block h-full">
        <article
          className={cn(
            "relative h-full rounded-xl border bg-card",
            "overflow-hidden",
            "transition-all duration-300 ease-out",
            "hover:border-primary/20",
            "hover:shadow-lg hover:shadow-primary/5",
            "hover:-translate-y-0.5",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          )}
        >
          <RendererThumbnail
            techniques={renderer.technique as RenderingTechnique[]}
            thumbnail={renderer.thumbnail}
            alt={`${renderer.name} rendered output`}
            className="h-36 w-full"
          />

          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1">
                {renderer.name}
              </h3>
              <StatusIndicator
                status={renderer.status}
                showLabel={false}
                size="sm"
              />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {renderer.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {renderer.technique.map((tech) => (
                <TechniqueBadge key={tech} technique={tech} size="sm" />
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Code2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {renderer.language}
                </span>
              </div>

              <StarRating
                stars={renderer.github_stars}
                maxStars={maxStars}
                showBar={false}
              />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
