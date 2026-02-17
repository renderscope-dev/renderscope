"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Technique } from "@/types/learn";
import { cn } from "@/lib/utils";

interface TechniqueNavProps {
  currentTechnique: Technique;
  allTechniques: Technique[];
}

export function TechniqueNav({
  currentTechnique,
  allTechniques,
}: TechniqueNavProps) {
  const currentIndex = allTechniques.findIndex(
    (t) => t.id === currentTechnique.id
  );

  const prevIndex =
    currentIndex <= 0 ? allTechniques.length - 1 : currentIndex - 1;
  const nextIndex =
    currentIndex >= allTechniques.length - 1 ? 0 : currentIndex + 1;

  const prev = allTechniques[prevIndex]!;
  const next = allTechniques[nextIndex]!;

  return (
    <nav
      aria-label="Technique navigation"
      className="mt-16 flex items-stretch gap-4"
    >
      <Link
        href={`/learn/${prev.id}`}
        className={cn(
          "group flex flex-1 items-center gap-3 rounded-xl border border-border/50 p-4",
          "transition-all duration-200",
          "hover:border-border hover:bg-card/50"
        )}
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Previous</p>
          <p className="truncate text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {prev.name}
          </p>
        </div>
      </Link>

      <Link
        href={`/learn/${next.id}`}
        className={cn(
          "group flex flex-1 items-center justify-end gap-3 rounded-xl border border-border/50 p-4 text-right",
          "transition-all duration-200",
          "hover:border-border hover:bg-card/50"
        )}
      >
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Next</p>
          <p className="truncate text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {next.name}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </nav>
  );
}
