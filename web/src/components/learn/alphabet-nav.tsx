"use client";

import { cn } from "@/lib/utils";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AlphabetNavProps {
  activeLetters: string[];
  currentLetter?: string;
  onLetterClick: (letter: string) => void;
}

export function AlphabetNav({
  activeLetters,
  currentLetter,
  onLetterClick,
}: AlphabetNavProps) {
  return (
    <nav
      aria-label="Alphabet navigation"
      className="flex flex-wrap gap-1 overflow-x-auto py-2"
    >
      {LETTERS.map((letter) => {
        const isActive = activeLetters.includes(letter);
        const isCurrent = currentLetter === letter;

        return (
          <button
            key={letter}
            onClick={() => isActive && onLetterClick(letter)}
            disabled={!isActive}
            aria-label={`Jump to letter ${letter}`}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
              isActive
                ? isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
                : "cursor-default text-muted-foreground/30"
            )}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
