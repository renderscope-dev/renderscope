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
  blue: "text-blue-400",
  purple: "text-purple-400",
  emerald: "text-emerald-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
  pink: "text-pink-400",
  green: "text-green-400",
  cyan: "text-cyan-400",
  rose: "text-rose-400",
};

export function FeaturePreviewCard({
  icon,
  title,
  description,
  accentColor = "blue",
}: FeaturePreviewCardProps) {
  const iconColor = accentIconColors[accentColor] || accentIconColors.blue;

  return (
    <motion.div
      className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-border"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={cn("mb-3", iconColor)}>{icon}</div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}
