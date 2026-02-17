"use client";

import Link from "next/link";
import { Heart, Plus, Upload, Bug, ArrowLeft, Github } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FeaturePreviewCard } from "@/components/feature-preview-card";
import { siteConfig } from "@/lib/constants";

const contributions = [
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Add a Renderer",
    description:
      "Submit a pull request with a JSON profile for a rendering engine we haven't cataloged yet.",
    accentColor: "sky",
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Submit Benchmarks",
    description:
      "Run standardized benchmarks on your hardware and contribute results to the community dataset.",
    accentColor: "sky",
  },
  {
    icon: <Bug className="h-5 w-5" />,
    title: "Report Issues",
    description:
      "Found something wrong? Let us know via GitHub Issues.",
    accentColor: "sky",
  },
];

export function ContributingPageContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Heart className="h-12 w-12" />}
        title="Contributing"
        subtitle="RenderScope is open source and community-driven. Here's how you can help."
        accentColor="sky"
        badge="Guide Coming Soon"
      />

      {/* Contribution type cards */}
      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {contributions.map((contrib) => (
          <FeaturePreviewCard
            key={contrib.title}
            icon={contrib.icon}
            title={contrib.title}
            description={contrib.description}
            accentColor={contrib.accentColor}
          />
        ))}
      </div>

      {/* GitHub link */}
      <div className="mt-12 text-center">
        <a
          href={siteConfig.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Github className="h-4 w-4" />
          View on GitHub &rarr;
        </a>
      </div>

      {/* Back link */}
      <div className="mt-12">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Docs
        </Link>
      </div>
    </div>
  );
}
