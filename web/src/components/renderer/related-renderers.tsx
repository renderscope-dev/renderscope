"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, Star } from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { SectionHeading } from "@/components/shared/section-heading";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { formatStars } from "@/lib/utils";

interface RelatedRenderersProps {
  renderers: RendererData[];
  currentRendererId: string;
}

export function RelatedRenderers({
  renderers,
  currentRendererId,
}: RelatedRenderersProps) {
  const filtered = renderers
    .filter((r) => r.id !== currentRendererId)
    .slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title="Related Renderers"
        icon={<Layers className="h-5 w-5" />}
        id="related"
      />

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
          {filtered.map((renderer, i) => (
            <motion.div
              key={renderer.id}
              className="shrink-0 w-[260px]"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
            >
              <RelatedCard renderer={renderer} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((renderer, i) => (
          <motion.div
            key={renderer.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
          >
            <RelatedCard renderer={renderer} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RelatedCard({ renderer }: { renderer: RendererData }) {
  return (
    <Link
      href={`/renderer/${renderer.id}`}
      className="group block rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:border-border hover:bg-card/80 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
          {renderer.name}
        </h3>
        {renderer.github_stars != null && renderer.github_stars > 0 && (
          <span className="inline-flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
            <Star className="h-3 w-3" aria-hidden="true" />
            {formatStars(renderer.github_stars)}
          </span>
        )}
      </div>

      <p
        className="text-xs text-muted-foreground truncate mb-3"
        title={renderer.description}
      >
        {renderer.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {renderer.technique.slice(0, 2).map((t) => (
          <TechniqueBadge key={t} technique={t} size="sm" />
        ))}
      </div>
    </Link>
  );
}
