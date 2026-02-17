"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type {
  Technique,
  TocHeading,
  FurtherReadingLink,
  RendererCardData,
} from "@/types/learn";
import { TableOfContents } from "./table-of-contents";
import { RelatedRenderers } from "./related-renderers";
import { TechniqueNav } from "./technique-nav";
import { FurtherReading } from "./further-reading";
import { cn } from "@/lib/utils";

interface TechniquePageLayoutProps {
  technique: Technique;
  allTechniques: Technique[];
  headings: TocHeading[];
  relatedRenderers: RendererCardData[];
  furtherReading: FurtherReadingLink[];
  children: React.ReactNode;
}

const accentBadgeColors: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  green: "bg-green-500/10 text-green-400 ring-green-500/20",
  purple: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  pink: "bg-pink-500/10 text-pink-400 ring-pink-500/20",
  orange: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
};

export function TechniquePageLayout({
  technique,
  allTechniques,
  headings,
  relatedRenderers,
  furtherReading,
  children,
}: TechniquePageLayoutProps) {
  const badgeColor =
    accentBadgeColors[technique.accentColor] ?? accentBadgeColors.blue;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/learn" className="hover:text-foreground transition-colors">
          Learn
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{technique.name}</span>
      </nav>

      {/* Page Header */}
      <header className="mb-10">
        <span
          className={cn(
            "mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
            badgeColor
          )}
        >
          {technique.name}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {technique.name}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {technique.shortDescription}
        </p>
      </header>

      {/* Mobile TOC */}
      <TableOfContents headings={headings} accentColor={technique.accentColor} />

      {/* Main Content Grid: TOC sidebar + article */}
      <div className="flex gap-10">
        {/* Sidebar TOC (desktop) */}
        <aside className="hidden lg:block w-56 shrink-0">
          <TableOfContents
            headings={headings}
            accentColor={technique.accentColor}
          />
        </aside>

        {/* Article Content */}
        <article className="min-w-0 flex-1">
          {/* MDX Body */}
          <div className="mdx-content">{children}</div>

          {/* Related Renderers */}
          <RelatedRenderers
            renderers={relatedRenderers}
            techniqueName={technique.name}
          />

          {/* Further Reading */}
          <FurtherReading links={furtherReading} />

          {/* Previous/Next Navigation */}
          <TechniqueNav
            currentTechnique={technique}
            allTechniques={allTechniques}
          />
        </article>
      </div>
    </div>
  );
}
