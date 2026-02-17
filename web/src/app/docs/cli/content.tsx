"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Terminal, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const cliCommands = [
  { cmd: "renderscope list", comment: "List detected renderers" },
  { cmd: "renderscope benchmark", comment: "Run standardized benchmarks" },
  { cmd: "renderscope compare", comment: "Compare rendered images" },
  { cmd: "renderscope report", comment: "Generate HTML reports" },
  { cmd: "renderscope system-info", comment: "Print hardware specs" },
];

export function CLIReferenceContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Terminal className="h-12 w-12" />}
        title="CLI Reference"
        subtitle="The complete command reference for the renderscope Python CLI tool."
        accentColor="sky"
        badge="Coming Soon"
      />

      {/* CLI preview code block */}
      <motion.div
        className="mt-12 overflow-hidden rounded-lg border border-border/50 bg-black/50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2.5">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <div className="p-4 font-mono text-sm">
          {cliCommands.map((line, i) => (
            <div key={i} className="py-0.5">
              <span className="text-foreground/90">{line.cmd}</span>
              <span className="ml-4 text-muted-foreground/40">
                # {line.comment}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <p className="mt-6 text-center text-sm text-muted-foreground/60">
        Full documentation will be auto-generated from the Python package.
      </p>

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
