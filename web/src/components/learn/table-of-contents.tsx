"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import type { TocHeading } from "@/types/learn";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headings: TocHeading[];
  accentColor?: string;
}

const accentActiveColors: Record<string, string> = {
  blue: "text-blue-400 border-blue-400",
  green: "text-green-400 border-green-400",
  purple: "text-purple-400 border-purple-400",
  pink: "text-pink-400 border-pink-400",
  orange: "text-orange-400 border-orange-400",
  rose: "text-rose-400 border-rose-400",
  cyan: "text-cyan-400 border-cyan-400",
};

export function TableOfContents({
  headings,
  accentColor = "blue",
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const activeStyle =
    accentActiveColors[accentColor] ?? "text-blue-400 border-blue-400";

  const handleObserver = useCallback(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0]!.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const cleanup = handleObserver();
    return cleanup;
  }, [handleObserver]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      setIsOpen(false);
    }
  };

  if (headings.length === 0) return null;

  const tocContent = (
    <ul className="space-y-1">
      {headings.map((heading) => (
        <li key={heading.id}>
          <button
            onClick={() => scrollToHeading(heading.id)}
            className={cn(
              "block w-full text-left text-sm transition-colors duration-200 border-l-2 py-1",
              heading.level === 3 ? "pl-6" : "pl-3",
              activeId === heading.id
                ? activeStyle
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          On this page
        </p>
        {tocContent}
      </nav>

      {/* Mobile: collapsible panel */}
      <div className="lg:hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm font-medium text-foreground"
          aria-expanded={isOpen}
          aria-controls="mobile-toc"
        >
          <span>Table of Contents</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div
            id="mobile-toc"
            className="mt-2 rounded-lg border border-border/50 bg-card/50 p-4"
          >
            {tocContent}
          </div>
        )}
      </div>
    </>
  );
}
