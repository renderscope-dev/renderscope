"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { RendererCardData } from "@/types/learn";
import { cn } from "@/lib/utils";
import { statusConfig } from "@/lib/constants";

interface RelatedRenderersProps {
  renderers: RendererCardData[];
  techniqueName: string;
}

const MAX_VISIBLE = 8;

export function RelatedRenderers({
  renderers,
  techniqueName,
}: RelatedRenderersProps) {
  if (renderers.length === 0) {
    return (
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Renderers Using {techniqueName}
        </h2>
        <p className="text-sm text-muted-foreground">
          No renderers in the catalog use this technique yet.
        </p>
      </section>
    );
  }

  const visible = renderers.slice(0, MAX_VISIBLE);
  const hasMore = renderers.length > MAX_VISIBLE;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold text-foreground">
        Renderers Using {techniqueName}
      </h2>
      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {visible.map((renderer) => {
          const status = statusConfig[renderer.status];
          return (
            <Link
              key={renderer.id}
              href={`/renderer/${renderer.id}`}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/50 px-4 py-2.5",
                "transition-all duration-200",
                "hover:border-border hover:bg-card"
              )}
            >
              <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                {renderer.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {renderer.language}
              </span>
              {status && (
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    status.dotColor
                  )}
                  title={status.label}
                />
              )}
            </Link>
          );
        })}
      </motion.div>
      {hasMore && (
        <Link
          href="/explore"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all on Explore
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}
