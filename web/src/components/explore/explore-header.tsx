import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ExploreHeaderProps {
  totalCount: number;
  activeCount: number;
}

export function ExploreHeader({ totalCount, activeCount }: ExploreHeaderProps) {
  return (
    <header className="pt-8 pb-6 sm:pt-10 sm:pb-8 space-y-4">
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Explore</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Explore Renderers
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Browse and compare{" "}
          <span className="text-foreground font-medium tabular-nums">
            {totalCount}
          </span>{" "}
          open source rendering engines ({activeCount} actively maintained) — from physically based path tracers to
          neural radiance fields to real-time rasterizers.
        </p>
      </div>
    </header>
  );
}
