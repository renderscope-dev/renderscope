"use client";

import Link from "next/link";
import type { GlossaryTerm } from "@/types/learn";

interface GlossaryTermCardProps {
  term: GlossaryTerm;
  onRelatedClick?: (termName: string) => void;
}

export function GlossaryTermCard({ term, onRelatedClick }: GlossaryTermCardProps) {
  return (
    <div className="py-4 first:pt-0">
      <h3 className="text-base font-semibold text-foreground">{term.term}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {term.definition}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {term.related.length > 0 && (
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground/70">
            <span className="font-medium">Related:</span>
            {term.related.map((rel, i) => (
              <span key={rel}>
                <button
                  onClick={() => onRelatedClick?.(rel)}
                  className="text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  {rel}
                </button>
                {i < term.related.length - 1 && ","}
              </span>
            ))}
          </span>
        )}

        {term.seeAlso && (
          <Link
            href={term.seeAlso}
            className="text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            See technique &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
