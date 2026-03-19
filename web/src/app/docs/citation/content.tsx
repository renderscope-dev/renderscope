"use client";

import Link from "next/link";
import { Quote, ArrowLeft, FileCode, FileText, Type, Info } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CitationCard } from "@/components/docs/citation-card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Citation content                                                   */
/* ------------------------------------------------------------------ */

const bibtex = `@software{renderscope2026,
  author       = {Ashutosh Singh},
  title        = {{RenderScope}: An Open Source Platform for Cataloging,
                  Comparing, and Benchmarking Rendering Engines},
  year         = {2026},
  url          = {https://renderscope.dev},
  note         = {Open source software, Apache-2.0 license}
}`;

const citationCff = `cff-version: 1.2.0
message: "If you use this software, please cite it as below."
type: software
title: "RenderScope"
abstract: "An open source platform for cataloging, comparing, and benchmarking rendering engines."
authors:
  - family-names: "Singh"
    given-names: "Ashutosh"
version: "1.0.0"
date-released: "2026-01-01"
license: Apache-2.0
url: "https://renderscope.dev"
repository-code: "https://github.com/renderscope-dev/renderscope"`;

const plainText = `Ashutosh Singh (2026). RenderScope: An Open Source Platform for Cataloging, Comparing, and Benchmarking Rendering Engines [Computer software]. https://renderscope.dev`;

/* ------------------------------------------------------------------ */
/*  Callout                                                            */
/* ------------------------------------------------------------------ */

function Callout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3",
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
      <div className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export function CitationPageContent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Quote className="h-12 w-12" />}
        title="Cite RenderScope"
        subtitle="If you use RenderScope in your research, we'd appreciate a citation. Here are the formats you'll need."
        accentColor="sky"
      />

      {/* ── Primary citation ─────────────────────────────────── */}
      <motion.div
        className="mt-16 rounded-xl border border-sky-500/20 bg-sky-500/5 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          If you use RenderScope&apos;s data, benchmarks, or tools in a
          publication, please cite:
        </p>
        <p className="text-sm font-medium leading-relaxed text-foreground">
          Ashutosh Singh. RenderScope: An Open Source Platform for Cataloging,
          Comparing, and Benchmarking Rendering Engines. 2026. Available at:{" "}
          <span className="text-sky-400">https://renderscope.dev</span>
        </p>
      </motion.div>

      {/* ── Citation format cards ────────────────────────────── */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CitationCard
          icon={<FileCode className="h-4 w-4" />}
          title="BibTeX"
          citation={bibtex}
          copyLabel="Copy BibTeX citation to clipboard"
        />
        <CitationCard
          icon={<FileText className="h-4 w-4" />}
          title="CITATION.cff"
          citation={citationCff}
          copyLabel="Copy CITATION.cff to clipboard"
        />
        <CitationCard
          icon={<Type className="h-4 w-4" />}
          title="Plain Text"
          citation={plainText}
          copyLabel="Copy plain text citation to clipboard"
        />
      </div>

      {/* ── JOSS note ────────────────────────────────────────── */}
      <Callout className="mt-10">
        <p>
          <span className="font-medium text-foreground">
            JOSS Publication (Pending):
          </span>{" "}
          A paper describing RenderScope has been submitted to the Journal of
          Open Source Software. When published, the DOI will be added to the
          citations above, and the BibTeX entry will be updated to reference the
          peer-reviewed paper.
        </p>
      </Callout>

      {/* ── Cite a specific renderer ─────────────────────────── */}
      <motion.section
        className="mt-12"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground">
          Cite a Specific Renderer
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each renderer in the RenderScope catalog has a permanent URL that can
          be cited directly:
        </p>
        <p className="mt-2 font-mono text-sm text-sky-400">
          https://renderscope.dev/renderer/[renderer-id]
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          For example, to reference the Mitsuba 3 profile:{" "}
          <Link
            href="/renderer/mitsuba3"
            className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
          >
            https://renderscope.dev/renderer/mitsuba3
          </Link>
        </p>
      </motion.section>

      {/* ── Back link ────────────────────────────────────────── */}
      <div className="mt-16">
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
