"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor?: string;
  badge?: string;
}

const accentGradients: Record<string, string> = {
  blue: "from-blue-500 to-blue-400",
  purple: "from-purple-500 to-purple-400",
  emerald: "from-emerald-500 to-emerald-400",
  orange: "from-orange-500 to-orange-400",
  amber: "from-amber-500 to-amber-400",
  sky: "from-sky-500 to-sky-400",
  rose: "from-rose-500 to-rose-400",
  pink: "from-pink-500 to-pink-400",
};

const accentBadgeColors: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  purple: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  orange: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  sky: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  pink: "bg-pink-500/10 text-pink-400 ring-pink-500/20",
};

const accentIconColors: Record<string, string> = {
  blue: "text-blue-500/60",
  purple: "text-purple-500/60",
  emerald: "text-emerald-500/60",
  orange: "text-orange-500/60",
  amber: "text-amber-500/60",
  sky: "text-sky-500/60",
  rose: "text-rose-500/60",
  pink: "text-pink-500/60",
};

export function PageHeader({
  icon,
  title,
  subtitle,
  accentColor = "blue",
  badge,
}: PageHeaderProps) {
  const gradient = accentGradients[accentColor] || accentGradients.blue;
  const badgeColor = accentBadgeColors[accentColor] || accentBadgeColors.blue;
  const iconColor = accentIconColors[accentColor] || accentIconColors.blue;

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={cn("mb-4", iconColor)}>{icon}</div>

      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {title}
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
        {subtitle}
      </p>

      <div
        className={cn(
          "mt-4 h-px w-12 bg-gradient-to-r",
          gradient
        )}
      />

      {badge && (
        <span
          className={cn(
            "mt-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
            badgeColor
          )}
        >
          {badge}
        </span>
      )}
    </motion.div>
  );
}
