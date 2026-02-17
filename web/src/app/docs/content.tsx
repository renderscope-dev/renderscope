"use client";

import Link from "next/link";
import { FileText, Terminal, Code, Heart } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const docSections = [
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "CLI Reference",
    description:
      "Complete reference for the renderscope command-line tool. Every command, every flag, with examples.",
    href: "/docs/cli",
    accentColor: "text-sky-400",
  },
  {
    icon: <Code className="h-5 w-5" />,
    title: "Component API",
    description:
      "Props, types, and usage examples for every component in the renderscope-ui npm package.",
    href: "/docs/api",
    accentColor: "text-sky-400",
  },
  {
    icon: <Heart className="h-5 w-5" />,
    title: "Contributing",
    description:
      "How to add a renderer, submit benchmarks, report issues, and contribute code.",
    href: "/docs/contributing",
    accentColor: "text-sky-400",
  },
];

export function DocsPageContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<FileText className="h-12 w-12" />}
        title="Documentation"
        subtitle="Everything you need to use RenderScope — from the CLI tool and component library to contributing new renderers."
        accentColor="sky"
        badge="Coming Soon"
      />

      {/* Doc section cards */}
      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {docSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-border"
          >
            <div className={`mb-3 ${section.accentColor}`}>
              {section.icon}
            </div>
            <h3 className="mb-2 text-base font-semibold text-foreground group-hover:text-white">
              {section.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
