"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { StarRating } from "@/components/shared/star-rating";
import { StatusIndicator } from "@/components/shared/status-indicator";
import type { RendererCardData } from "@/types/renderer";
import { Code2, ArrowRight } from "lucide-react";

interface RendererCardListProps {
  renderer: RendererCardData;
  index: number;
  maxStars?: number;
}

export function RendererCardList({
  renderer,
  index,
  maxStars,
}: RendererCardListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.4),
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Link href={`/renderer/${renderer.id}`} className="group block">
        <article
          className={cn(
            "relative flex items-center gap-4 rounded-lg border bg-card px-4 py-3",
            "transition-all duration-200 ease-out",
            "hover:border-primary/20 hover:bg-card/80",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          )}
        >
          <StatusIndicator
            status={renderer.status}
            showLabel={false}
            size="sm"
          />

          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors w-48 shrink-0 truncate">
            {renderer.name}
          </h3>

          <p className="hidden md:block text-sm text-muted-foreground flex-1 truncate">
            {renderer.description}
          </p>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {renderer.technique.slice(0, 2).map((tech) => (
              <TechniqueBadge key={tech} technique={tech} size="sm" />
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-muted-foreground shrink-0 w-24">
            <Code2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium truncate">
              {renderer.language}
            </span>
          </div>

          <div className="shrink-0 w-20">
            <StarRating
              stars={renderer.github_stars}
              maxStars={maxStars}
              showBar={false}
            />
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </article>
      </Link>
    </motion.div>
  );
}
