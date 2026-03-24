"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** Use tighter padding (for compact accent strips like StatsBar). */
  compact?: boolean;
  /** Test identifier for Playwright selectors. */
  "data-testid"?: string;
}

export function SectionWrapper({
  children,
  id,
  className,
  compact = false,
  "data-testid": dataTestId,
}: SectionWrapperProps) {
  return (
    <motion.section
      id={id}
      data-testid={dataTestId}
      className={cn(
        "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
        compact ? "py-10 sm:py-12" : "py-14 sm:py-20 lg:py-24",
        className
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
