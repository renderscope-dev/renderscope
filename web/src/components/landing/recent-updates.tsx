"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { landingContent } from "@/lib/constants";
import { SectionWrapper } from "./section-wrapper";

const { recentUpdates } = landingContent;

interface RecentUpdateCardProps {
  renderer: RendererData;
}

function RecentUpdateCard({ renderer }: RecentUpdateCardProps) {
  return (
    <Link
      href={`/renderer/${renderer.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30"
    >
      {/* Technique badges */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {renderer.technique.slice(0, 2).map((t) => (
          <TechniqueBadge key={t} technique={t} size="sm" />
        ))}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-foreground">
        {renderer.name}
      </h3>

      {/* Description (single line, truncated) */}
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
        {renderer.description}
      </p>

      {/* View profile link */}
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
        View profile
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

interface RecentUpdatesProps {
  renderers: RendererData[];
}

export function RecentUpdates({ renderers }: RecentUpdatesProps) {
  if (renderers.length === 0) return null;

  return (
    <SectionWrapper id="recent">
      {/* Heading */}
      <div className="mb-10 sm:mb-14">
        <h2 className="text-display-sm text-foreground">
          {recentUpdates.heading}
        </h2>
        <p className="mt-4 max-w-lg text-muted-foreground">
          {recentUpdates.subtitle}
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderers.map((r) => (
          <RecentUpdateCard key={r.id} renderer={r} />
        ))}
      </div>

      {/* "See all" link */}
      <div className="mt-8 text-center">
        <Link
          href="/explore"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse all renderers
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </SectionWrapper>
  );
}
