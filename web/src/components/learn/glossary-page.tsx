"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search, ChevronRight } from "lucide-react";
import type { GlossaryTerm } from "@/types/learn";
import { GlossaryTermCard } from "./glossary-term-card";
import { AlphabetNav } from "./alphabet-nav";
import { cn } from "@/lib/utils";

interface GlossaryPageProps {
  terms: GlossaryTerm[];
}

export function GlossaryPageClient({ terms }: GlossaryPageProps) {
  const [query, setQuery] = useState("");
  const [currentLetter, setCurrentLetter] = useState<string | undefined>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(terms, {
        keys: ["term", "definition"],
        threshold: 0.3,
        includeScore: true,
      }),
    [terms]
  );

  const filteredTerms = useMemo(() => {
    if (!query.trim()) return terms;
    return fuse.search(query).map((result) => result.item);
  }, [fuse, query, terms]);

  // Group by first letter
  const grouped = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    for (const term of filteredTerms) {
      const letter = term.term.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    }
    return groups;
  }, [filteredTerms]);

  const activeLetters = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped]
  );

  const scrollToLetter = useCallback((letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentLetter(letter);
    }
  }, []);

  const handleRelatedClick = useCallback(
    (termName: string) => {
      // Try to find the term and scroll to it
      const found = terms.find(
        (t) => t.term.toLowerCase() === termName.toLowerCase()
      );
      if (found) {
        setQuery("");
        const letter = found.term.charAt(0).toUpperCase();
        // Delay to let the query reset take effect
        requestAnimationFrame(() => {
          scrollToLetter(letter);
        });
      }
    },
    [terms, scrollToLetter]
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/learn" className="hover:text-foreground transition-colors">
          Learn
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Glossary</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Rendering Glossary
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Quick definitions for common rendering terms, acronyms, and concepts.
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search glossary terms..."
          aria-label="Search glossary terms"
          className={cn(
            "w-full rounded-lg border border-border/50 bg-card/50 py-2.5 pl-10 pr-20 text-sm text-foreground",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring",
            "transition-colors"
          )}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* Alphabet Nav */}
      {!query && (
        <AlphabetNav
          activeLetters={activeLetters}
          currentLetter={currentLetter}
          onLetterClick={scrollToLetter}
        />
      )}

      {/* Terms */}
      <div className="mt-6">
        {filteredTerms.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No matching terms found. Try a different search, or{" "}
              <button
                onClick={() => setQuery("")}
                className="text-primary hover:underline"
              >
                browse the full glossary
              </button>
              .
            </p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, letterTerms]) => (
              <section key={letter} className="mb-8">
                <h2
                  id={`letter-${letter}`}
                  className="mb-2 scroll-mt-24 border-b border-border/40 pb-1 text-lg font-semibold text-foreground"
                >
                  {letter}
                </h2>
                <div className="divide-y divide-border/20">
                  {letterTerms.map((term) => (
                    <GlossaryTermCard
                      key={term.term}
                      term={term}
                      onRelatedClick={handleRelatedClick}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
