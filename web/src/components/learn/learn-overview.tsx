"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Clock } from "lucide-react";
import type { Technique } from "@/types/learn";
import { TechniqueCard } from "./technique-card";
import { cn } from "@/lib/utils";

interface LearnOverviewProps {
  techniques: Technique[];
}

export function LearnOverview({ techniques }: LearnOverviewProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Learn
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Understand the techniques behind modern rendering
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground/80">
          From physically-based path tracing to real-time rasterization to the
          latest neural approaches, rendering spans a fascinating range of
          techniques. Explore each one to understand how it works, which
          renderers use it, and when to choose it.
        </p>
        <div className="mt-6 h-px w-12 mx-auto bg-gradient-to-r from-primary to-purple-500" />
      </motion.div>

      {/* Technique Cards Grid */}
      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {techniques.map((technique, i) => (
          <TechniqueCard key={technique.id} technique={technique} index={i} />
        ))}
      </div>

      {/* Resources Section */}
      <motion.div
        className="mt-20"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
      >
        <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
          More Resources
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 max-w-2xl mx-auto">
          <ResourceCard
            href="/learn/glossary"
            icon={<BookOpen className="h-5 w-5" />}
            title="Rendering Glossary"
            description="A searchable dictionary of rendering terms, acronyms, and concepts."
          />
          <ResourceCard
            href="/learn/timeline"
            icon={<Clock className="h-5 w-5" />}
            title="Renderer Timeline"
            description="An interactive visualization of when each rendering engine was first released."
          />
        </div>
      </motion.div>
    </div>
  );
}

function ResourceCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-4 rounded-xl border border-border/50 p-5",
        "transition-all duration-300",
        "hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
