"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeaturePreviewCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: string;
}

const accentIconColors: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-purple-600 dark:text-purple-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  orange: "text-orange-600 dark:text-orange-400",
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-600 dark:text-sky-400",
  pink: "text-pink-600 dark:text-pink-400",
  green: "text-green-600 dark:text-green-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
  rose: "text-rose-600 dark:text-rose-400",
};

const accentBgColors: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-500/10",
  purple: "bg-purple-50 dark:bg-purple-500/10",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10",
  orange: "bg-orange-50 dark:bg-orange-500/10",
  amber: "bg-amber-50 dark:bg-amber-500/10",
  sky: "bg-sky-50 dark:bg-sky-500/10",
  pink: "bg-pink-50 dark:bg-pink-500/10",
  green: "bg-green-50 dark:bg-green-500/10",
  cyan: "bg-cyan-50 dark:bg-cyan-500/10",
  rose: "bg-rose-50 dark:bg-rose-500/10",
};

export function FeaturePreviewCard({
  icon,
  title,
  description,
  accentColor = "blue",
}: FeaturePreviewCardProps) {
  const iconColor = accentIconColors[accentColor] || accentIconColors.blue;
  const bgColor = accentBgColors[accentColor] || accentBgColors.blue;

  return (
    <motion.div
      className="group rounded-2xl border border-border/50 bg-card/80 p-6 shadow-card backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-card-hover dark:bg-card/50"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
        <div className={iconColor}>{icon}</div>
      </div>
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}
