"use client";

import Link from "next/link";
import { ArrowRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  landingContent,
  comparisonPlaceholder,
  techniquePlaceholderGradients,
} from "@/lib/constants";
import { SectionWrapper } from "./section-wrapper";

const { comparison } = landingContent;

/** Data for one side of the comparison. */
export interface ComparisonSide {
  renderer: string;
  technique: string;
  src?: string;
}

interface FeaturedComparisonProps {
  left?: ComparisonSide;
  right?: ComparisonSide;
}

/**
 * Render image — shows a real WebP image if `src` is provided,
 * otherwise falls back to gradient + noise placeholder.
 */
function ComparisonImage({
  renderer,
  technique,
  src,
  className,
}: {
  renderer: string;
  technique: string;
  src?: string;
  className?: string;
}) {
  const gradientKey = technique.replace(/_/g, "-");
  const gradient =
    techniquePlaceholderGradients[gradientKey] ??
    techniquePlaceholderGradients["path-tracing"]!;

  return (
    <div
      className={cn("relative overflow-hidden bg-background", className)}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={`${renderer} render`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
              backgroundSize: "256px",
            }}
          />
        </>
      )}
      {/* Label */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 sm:p-4">
        <p className="text-xs font-semibold text-white/70 sm:text-sm">
          {renderer}
        </p>
      </div>
    </div>
  );
}

export function FeaturedComparison({ left, right }: FeaturedComparisonProps) {
  // Fall back to placeholder data if no real images provided
  const leftData = left ?? {
    renderer: comparisonPlaceholder.left.renderer,
    technique: comparisonPlaceholder.left.technique,
  };
  const rightData = right ?? {
    renderer: comparisonPlaceholder.right.renderer,
    technique: comparisonPlaceholder.right.technique,
  };

  return (
    <SectionWrapper id="comparison" data-testid="featured-comparison">
      {/* Heading */}
      <div className="mb-10 text-center sm:mb-14">
        <h2 className="text-display-sm text-foreground">{comparison.heading}</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {comparison.subtitle}
        </p>
      </div>

      {/* Comparison preview */}
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-xl border border-border shadow-2xl shadow-black/20">
          {/* Side-by-side images */}
          <div className="flex flex-col sm:flex-row">
            {/* Left image */}
            <div className="relative flex-1">
              <ComparisonImage
                renderer={leftData.renderer}
                technique={leftData.technique}
                src={leftData.src}
                className="aspect-[16/10]"
              />
              {/* Left label chip */}
              <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                {leftData.renderer}
              </div>
            </div>

            {/* Static divider */}
            <div className="relative z-10 flex items-center justify-center">
              {/* Horizontal rule on mobile */}
              <div className="h-px w-full bg-border/60 sm:hidden" />
              {/* Vertical divider on desktop */}
              <div className="hidden h-full w-px bg-border/60 sm:block" />
              {/* Handle circle */}
              <div className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background shadow-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Right image */}
            <div className="relative flex-1">
              <ComparisonImage
                renderer={rightData.renderer}
                technique={rightData.technique}
                src={rightData.src}
                className="aspect-[16/10]"
              />
              {/* Right label chip */}
              <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                {rightData.renderer}
              </div>
            </div>
          </div>
        </div>

        {/* CTA link */}
        <div className="mt-6 text-center">
          <Link
            href={comparison.cta.href}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {comparison.cta.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}
