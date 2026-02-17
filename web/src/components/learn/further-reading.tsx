"use client";

import { BookOpen, FileText, Video, GraduationCap, FileCode } from "lucide-react";
import type { FurtherReadingLink } from "@/types/learn";
import { cn } from "@/lib/utils";

interface FurtherReadingProps {
  links: FurtherReadingLink[];
}

const typeIcons: Record<string, React.ReactNode> = {
  paper: <FileText className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
  tutorial: <GraduationCap className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  documentation: <FileCode className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  paper: "Paper",
  book: "Book",
  tutorial: "Tutorial",
  video: "Video",
  documentation: "Docs",
};

export function FurtherReading({ links }: FurtherReadingProps) {
  if (links.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold text-foreground">
        Further Reading
      </h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-border/50 bg-card/30 p-4",
                "transition-all duration-200",
                "hover:border-border hover:bg-card/60"
              )}
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                {typeIcons[link.type] ?? typeIcons.tutorial}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                    {link.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {typeLabels[link.type] ?? link.type}
                  </span>
                </div>
                {link.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {link.description}
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
