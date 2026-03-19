"use client";

import Link from "next/link";
import {
  Heart,
  Database,
  BarChart3,
  Bug,
  GitPullRequest,
  ArrowLeft,
  ArrowDown,
  Info,
  Github,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/renderer/code-block";
import { StepSection } from "@/components/docs/step-section";
import { siteConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Pathway cards                                                      */
/* ------------------------------------------------------------------ */

const pathways = [
  {
    id: "add-renderer",
    icon: <Database className="h-5 w-5" />,
    title: "Add a Renderer",
    description:
      "Submit metadata for a rendering engine we haven't cataloged yet.",
  },
  {
    id: "submit-benchmarks",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Submit Benchmarks",
    description:
      "Run standardized benchmarks on your hardware and contribute results.",
  },
  {
    id: "report-issue",
    icon: <Bug className="h-5 w-5" />,
    title: "Report an Issue",
    description:
      "Found incorrect data, a broken page, or a bug? Let us know.",
  },
  {
    id: "contribute-code",
    icon: <GitPullRequest className="h-5 w-5" />,
    title: "Contribute Code",
    description:
      "Fix bugs, add features, or improve the web app, Python CLI, or npm package.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  JSON template snippet                                              */
/* ------------------------------------------------------------------ */

const rendererTemplateSnippet = `{
  "id": "your-renderer",
  "name": "Your Renderer",
  "version": "1.0.0",
  "description": "A one-line description of what this renderer does.",
  "technique": ["path_tracing"],
  "language": "C++",
  "license": "MIT",
  "platforms": ["linux", "macos", "windows"],
  "repository": "https://github.com/org/repo",
  "homepage": "https://example.com",
  "features": {
    "global_illumination": true,
    "gpu_acceleration": false,
    "python_api": true
  },
  "strengths": [
    "Physically accurate spectral rendering",
    "Well-documented codebase"
  ],
  "limitations": [
    "No GPU acceleration",
    "Limited scene format support"
  ],
  "best_for": "Research and educational use"
}`;

/* ------------------------------------------------------------------ */
/*  Code style table data                                              */
/* ------------------------------------------------------------------ */

const codeStyleRows = [
  {
    pkg: "Web / npm",
    linter: "ESLint",
    formatter: "Prettier",
    typeChecker: "TypeScript strict mode",
  },
  {
    pkg: "Python",
    linter: "Ruff",
    formatter: "Ruff",
    typeChecker: "mypy (strict)",
  },
] as const;

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
      <p className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section title                                                      */
/* ------------------------------------------------------------------ */

function SectionTitle({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.h2
      id={id}
      className="mb-6 flex scroll-mt-24 items-center gap-3 text-2xl font-bold tracking-tight text-foreground"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <span className="text-sky-400">{icon}</span>
      {children}
    </motion.h2>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export function ContributingPageContent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Heart className="h-12 w-12" />}
        title="Contributing to RenderScope"
        subtitle="RenderScope is open source and community-driven. Whether you want to add a renderer, submit benchmarks, fix a bug, or improve the code — here's how to get started."
        accentColor="sky"
      />

      {/* ── Pathway cards ───────────────────────────────────────── */}
      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pathways.map((p, i) => (
          <motion.a
            key={p.id}
            href={`#${p.id}`}
            className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-sky-500/30"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{
              duration: 0.4,
              delay: i * 0.08,
              ease: "easeOut",
            }}
          >
            <div className="text-sky-400">{p.icon}</div>
            <div className="flex-1">
              <h2 className="mb-1 text-sm font-semibold text-foreground group-hover:text-white">
                {p.title}
              </h2>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
            <ArrowDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-sky-400" />
          </motion.a>
        ))}
      </div>

      {/* ── Section 1: Add a Renderer ────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="add-renderer" icon={<Database className="h-6 w-6" />}>
          Adding a New Renderer
        </SectionTitle>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Each renderer in the RenderScope catalog is a single JSON file in{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
            /data/renderers/
          </code>
          . Contributing a new renderer means copying a template, filling in the
          fields, validating, and submitting a pull request. No code changes
          needed.
        </p>

        <StepSection
          steps={[
            {
              title: "Fork & Clone",
              content: (
                <>
                  <p className="mb-3">
                    Fork the RenderScope repository on GitHub, then clone your
                    fork locally.
                  </p>
                  <CodeBlock
                    code={`git clone https://github.com/YOUR-USERNAME/renderscope.git\ncd renderscope`}
                  />
                </>
              ),
            },
            {
              title: "Copy the Template",
              content: (
                <>
                  <p className="mb-3">
                    Copy{" "}
                    <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                      _template.json
                    </code>{" "}
                    and rename it to your renderer&apos;s slug (lowercase,
                    hyphens).
                  </p>
                  <CodeBlock code="cp data/renderers/_template.json data/renderers/your-renderer.json" />
                </>
              ),
            },
            {
              title: "Fill in the Data",
              content: (
                <>
                  <p className="mb-3">
                    Open the file and fill in the fields. Here&apos;s a condensed
                    example showing the most important fields:
                  </p>
                  <CodeBlock code={rendererTemplateSnippet} />
                  <p className="mt-3">
                    See the{" "}
                    <Link
                      href="/docs/schema"
                      className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
                    >
                      Data Schema documentation
                    </Link>{" "}
                    for the complete field reference. Fields like{" "}
                    <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                      strengths
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                      limitations
                    </code>{" "}
                    are where the most valuable editorial content goes — be
                    honest and specific.
                  </p>
                </>
              ),
            },
            {
              title: "Validate",
              content: (
                <>
                  <p className="mb-3">
                    Run the validation script to check your JSON against the
                    schema. CI will also run this on your pull request.
                  </p>
                  <CodeBlock code="python scripts/validate_data.py" />
                </>
              ),
            },
            {
              title: "Submit a Pull Request",
              content: (
                <>
                  <p className="mb-3">
                    Create a branch, commit your file, push, and open a PR on
                    GitHub. The PR template will guide you through the checklist.
                  </p>
                  <CodeBlock
                    code={`git checkout -b add-renderer/your-renderer\ngit add data/renderers/your-renderer.json\ngit commit -m "data: add Your Renderer profile"\ngit push origin add-renderer/your-renderer`}
                  />
                </>
              ),
            },
          ]}
        />

        <Callout>
          Not comfortable with Git? You can also open a GitHub Issue using our
          &ldquo;New Renderer Request&rdquo; template, and a maintainer will
          create the JSON file from your information.
        </Callout>
      </section>

      {/* ── Section 2: Submit Benchmarks ─────────────────────── */}
      <section className="mt-20">
        <SectionTitle
          id="submit-benchmarks"
          icon={<BarChart3 className="h-6 w-6" />}
        >
          Submitting Benchmark Results
        </SectionTitle>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Benchmark results let the community compare renderers on standardized
          scenes under controlled conditions. Results are more valuable when they
          come from diverse hardware — your contribution matters.
        </p>

        <h3 className="mb-3 text-base font-semibold text-foreground">
          Prerequisites
        </h3>
        <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>A renderer installed and working on your system</li>
          <li>Python 3.10+ installed</li>
          <li>
            The RenderScope CLI:{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
              pip install renderscope
            </code>
          </li>
        </ul>

        <StepSection
          steps={[
            {
              title: "Install the CLI",
              content: <CodeBlock code="pip install renderscope" />,
            },
            {
              title: "Download Benchmark Scenes",
              content: <CodeBlock code="renderscope download-scenes" />,
            },
            {
              title: "Run Benchmarks",
              content: (
                <CodeBlock
                  code={`# Single scene + selected renderers\nrenderscope benchmark --scene cornell-box --renderer pbrt mitsuba\n\n# Full suite\nrenderscope benchmark --scene all --renderer all`}
                />
              ),
            },
            {
              title: "Review Results",
              content: (
                <CodeBlock code="renderscope report results.json --format html --output report.html" />
              ),
            },
            {
              title: "Submit",
              content: (
                <p>
                  Copy the results JSON into{" "}
                  <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                    data/benchmarks/
                  </code>{" "}
                  and submit a pull request, or open a GitHub Issue with the
                  &ldquo;Benchmark Submission&rdquo; template and attach the
                  file.
                </p>
              ),
            },
          ]}
        />

        <Callout>
          See the{" "}
          <Link
            href="/docs/methodology"
            className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
          >
            Methodology page
          </Link>{" "}
          for details on how to ensure fair, reproducible results. Close other
          applications, let the system reach thermal equilibrium, and run
          multiple iterations.
        </Callout>
      </section>

      {/* ── Section 3: Report Issues ─────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="report-issue" icon={<Bug className="h-6 w-6" />}>
          Reporting Issues
        </SectionTitle>

        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              Data corrections
            </span>{" "}
            — Found wrong information about a renderer? Open a GitHub Issue with
            the &ldquo;Bug Report&rdquo; template, or submit a PR with the
            corrected JSON.
          </p>
          <p>
            <span className="font-medium text-foreground">Website bugs</span> —
            Broken page, missing image, rendering glitch? Open a GitHub Issue
            with the &ldquo;Bug Report&rdquo; template. Include your browser and
            OS.
          </p>
          <p>
            <span className="font-medium text-foreground">
              Feature requests
            </span>{" "}
            — Have an idea for a new feature? Open a GitHub Issue with the
            &ldquo;Feature Request&rdquo; template.
          </p>
        </div>

        <div className="mt-6">
          <a
            href={`${siteConfig.github}/issues/new/choose`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-400 transition-colors hover:border-sky-500/50 hover:bg-sky-500/15"
          >
            <Github className="h-4 w-4" />
            Open an Issue on GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* ── Section 4: Contribute Code ───────────────────────── */}
      <section className="mt-20">
        <SectionTitle
          id="contribute-code"
          icon={<GitPullRequest className="h-6 w-6" />}
        >
          Contributing Code
        </SectionTitle>

        {/* Development setup */}
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Development Setup
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Web App
            </h4>
            <CodeBlock
              code={`cd web\nnpm install\nnpm run dev        # Starts at http://localhost:3000`}
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Python Package
            </h4>
            <CodeBlock
              code={`cd python\npip install -e ".[dev]"\npytest             # Run tests`}
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              npm Component Library
            </h4>
            <CodeBlock
              code={`cd packages/renderscope-ui\nnpm install\nnpm run build      # Build the library\nnpm run storybook  # Component playground`}
            />
          </div>
        </div>

        {/* Code style */}
        <h3 className="mb-4 mt-10 text-lg font-semibold text-foreground">
          Code Style
        </h3>

        <div role="region" aria-label="Code style reference table" tabIndex={0} className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Package
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Linter
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Formatter
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Type Checker
                </th>
              </tr>
            </thead>
            <tbody>
              {codeStyleRows.map((row) => (
                <tr
                  key={row.pkg}
                  className="border-b border-border/30 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {row.pkg}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.linter}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.formatter}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.typeChecker}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Testing requirements */}
        <h3 className="mb-4 mt-10 text-lg font-semibold text-foreground">
          Testing Requirements
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Web:</span> Vitest
            for unit tests, Playwright for E2E
          </li>
          <li>
            <span className="font-medium text-foreground">Python:</span> pytest
            with coverage
          </li>
          <li>All PRs must pass CI before merging</li>
        </ul>

        {/* PR process */}
        <h3 className="mb-4 mt-10 text-lg font-semibold text-foreground">
          Pull Request Process
        </h3>

        <StepSection
          steps={[
            {
              title: "Create a feature branch from main",
              content: (
                <CodeBlock code="git checkout -b feature/my-change" />
              ),
            },
            {
              title: "Make your changes and write tests",
              content: (
                <p>
                  Keep changes focused. One feature or fix per PR is ideal.
                </p>
              ),
            },
            {
              title: "Run linting and tests locally",
              content: (
                <CodeBlock
                  code={`# Web\nnpm run lint && npm run type-check\n\n# Python\nruff check . && mypy . && pytest`}
                />
              ),
            },
            {
              title: "Push and open a PR",
              content: (
                <p>
                  The PR template will guide you through the checklist. A
                  maintainer will review within a few days.
                </p>
              ),
            },
            {
              title: "Address feedback and merge",
              content: (
                <p>
                  Once approved and CI passes, your contribution will be merged.
                </p>
              ),
            },
          ]}
        />

        <Callout>
          Looking for something to work on? Check our issues labeled{" "}
          <a
            href={`${siteConfig.github}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
          >
            good first issue
          </a>{" "}
          on GitHub.
        </Callout>
      </section>

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
