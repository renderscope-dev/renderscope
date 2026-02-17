"use client";

import {
  Github,
  BookOpen,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { cn } from "@/lib/utils";

interface ExternalLinksProps {
  renderer: RendererData;
  className?: string;
}

interface LinkItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function ExternalLinks({ renderer, className }: ExternalLinksProps) {
  const links: LinkItem[] = [];

  if (renderer.repository) {
    links.push({ href: renderer.repository, icon: Github, label: "Source Code" });
  }
  if (renderer.documentation) {
    links.push({
      href: renderer.documentation,
      icon: BookOpen,
      label: "Documentation",
    });
  }
  if (renderer.homepage) {
    links.push({ href: renderer.homepage, icon: Globe, label: "Homepage" });
  }
  if (renderer.paper) {
    links.push({ href: renderer.paper, icon: FileText, label: "Paper" });
  }

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`${link.label} (opens in new tab)`}
        >
          <link.icon
            className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{link.label}</span>
          <ExternalLink
            className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
}
