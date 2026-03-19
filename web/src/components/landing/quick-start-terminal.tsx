"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { landingContent } from "@/lib/constants";
import { SectionWrapper } from "./section-wrapper";

const { quickStart } = landingContent;

// ─── Typing animation hook ────────────────────────────────────

interface TypewriterState {
  /** Index of the command currently being typed. */
  commandIndex: number;
  /** How many characters of the current command are visible. */
  charIndex: number;
  /** Whether the typing is complete. */
  done: boolean;
}

function useTypewriter(
  commands: readonly string[],
  enabled: boolean,
  charDelay: number = 55,
  pauseBetween: number = 500
) {
  const [state, setState] = useState<TypewriterState>({
    commandIndex: 0,
    charIndex: 0,
    done: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.done) return prev;

      const currentCommand = commands[prev.commandIndex];
      if (!currentCommand) return { ...prev, done: true };

      // Still typing current command
      if (prev.charIndex < currentCommand.length) {
        return { ...prev, charIndex: prev.charIndex + 1 };
      }

      // Current command is done — move to next
      const nextIndex = prev.commandIndex + 1;
      if (nextIndex >= commands.length) {
        return { ...prev, done: true };
      }

      return { commandIndex: nextIndex, charIndex: 0, done: false };
    });
  }, [commands]);

  useEffect(() => {
    if (!enabled || hasStarted.current) return;
    hasStarted.current = true;

    // Small initial delay before starting
    timerRef.current = setTimeout(() => {
      const run = () => {
        setState((prev) => {
          if (prev.done) return prev;

          const currentCommand = commands[prev.commandIndex];
          if (!currentCommand) return { ...prev, done: true };

          // Determine delay: longer pause between commands
          const isEndOfCommand = prev.charIndex >= currentCommand.length;
          const delay = isEndOfCommand ? pauseBetween : charDelay;

          timerRef.current = setTimeout(() => {
            tick();
            run();
          }, delay);

          return prev;
        });
      };
      run();
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, commands, charDelay, pauseBetween, tick]);

  return state;
}

// ─── Copy button ──────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      aria-label="Copy install command"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

// ─── Terminal component ───────────────────────────────────────

export function QuickStartTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });
  const prefersReduced = useReducedMotion();

  // If reduced motion, show all commands immediately
  const showAll = !!prefersReduced;
  const typingEnabled = isInView && !showAll;

  const { commandIndex, charIndex, done } = useTypewriter(
    quickStart.commands,
    typingEnabled
  );

  return (
    <SectionWrapper id="quick-start">
      {/* Heading */}
      <div className="mb-10 text-center sm:mb-14">
        <h2 className="text-display-sm text-foreground">
          {quickStart.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {quickStart.subtitle}
        </p>
      </div>

      {/* Terminal window */}
      <div
        ref={containerRef}
        className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border/50 shadow-2xl shadow-black/20"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border/30 bg-[hsl(240,10%,6%)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-muted-foreground">Terminal</span>
          <CopyButton text={quickStart.commands[0]!} />
        </div>

        {/* Terminal body */}
        <div className="bg-[hsl(240,10%,5%)] p-4 font-mono text-sm sm:p-6">
          {quickStart.commands.map((command, i) => {
            let visibleText: string;

            if (showAll) {
              visibleText = command;
            } else if (i < commandIndex) {
              // Previous commands are fully shown
              visibleText = command;
            } else if (i === commandIndex) {
              // Currently typing this command
              visibleText = command.slice(0, charIndex);
            } else {
              // Future commands — hidden
              return null;
            }

            const isCurrentLine =
              !showAll && !done && i === commandIndex;

            return (
              <div key={i} className="py-0.5">
                <span className="mr-2 select-none text-emerald-400">$</span>
                <span className="text-foreground/90">{visibleText}</span>
                {/* Blinking cursor on active line */}
                {(isCurrentLine || (done && i === quickStart.commands.length - 1)) && (
                  <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-[2px] animate-pulse bg-foreground/70" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
