"use client";

import { motion } from "framer-motion";
import { CopyButton } from "@/components/renderer/copy-button";
import { cn } from "@/lib/utils";

interface CitationCardProps {
  icon: React.ReactNode;
  title: string;
  /** The raw citation text that gets copied */
  citation: string;
  /** Accessible label for the copy button */
  copyLabel?: string;
  className?: string;
}

export function CitationCard({
  icon,
  title,
  citation,
  copyLabel,
  className,
}: CitationCardProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors duration-300 hover:border-border",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3.5">
        <span className="text-sky-400">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {/* Citation body */}
      <div className="relative flex-1 overflow-x-auto bg-zinc-950/50 p-4 pr-12">
        <div className="absolute right-2 top-2 z-10">
          <CopyButton text={citation} />
        </div>
        <pre className="text-xs font-mono leading-relaxed text-zinc-300 sm:text-sm">
          <code>{citation}</code>
        </pre>
      </div>

      {/* Footer with accessible copy label */}
      <div className="border-t border-border/40 px-5 py-2.5">
        <p className="text-xs text-muted-foreground">
          {copyLabel ?? "Click the copy icon to copy to clipboard"}
        </p>
      </div>
    </motion.div>
  );
}
