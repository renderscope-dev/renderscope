"use client";

import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  Shield,
  Repeat,
  Eye,
  Scale,
  Info,
  Cpu,
  Timer,
  MemoryStick,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/renderer/code-block";
import { FormulaBlock } from "@/components/docs/formula-block";
import { StepSection } from "@/components/docs/step-section";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

function Callout({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
  className?: string;
}) {
  const isWarning = variant === "warning";
  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-lg border px-4 py-3",
        isWarning
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-sky-500/20 bg-sky-500/5",
        className
      )}
    >
      {isWarning ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
      )}
      <div className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings standardization table data                                */
/* ------------------------------------------------------------------ */

const settingsRows = [
  {
    parameter: "Resolution",
    value: "1920 \u00d7 1080",
    rationale:
      "Industry standard HD; stresses renderers without being extreme",
  },
  {
    parameter: "Sample Count (path tracers)",
    value: "1024 spp",
    rationale:
      "High enough for convergence on most scenes; standard in research",
  },
  {
    parameter: "Time Budget (real-time)",
    value: "60 s warmup + 10 s measured",
    rationale: "Allows GPU caches to stabilize",
  },
  {
    parameter: "Integrator",
    value: "Renderer default path tracer",
    rationale:
      "Fairest comparison — each renderer\u2019s best general-purpose integrator",
  },
  {
    parameter: "Denoiser",
    value: "Disabled",
    rationale:
      "Denoisers vary wildly; comparing raw output is more meaningful",
  },
  {
    parameter: "Tone Mapping",
    value: "Linear (no tone mapping)",
    rationale:
      "Metrics must operate on linear data; sRGB is applied only for display",
  },
  {
    parameter: "Thread Count",
    value: "All available cores",
    rationale: "Maximizes each renderer\u2019s performance",
  },
  {
    parameter: "GPU",
    value: "Enabled when supported",
    rationale: "Tests the renderer\u2019s best available path",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Fairness protocol steps                                            */
/* ------------------------------------------------------------------ */

const fairnessSteps = [
  {
    title: "Exclusive system access",
    content: (
      <p>
        No other computationally intensive processes running during benchmarks.
        Close all browsers, IDEs, and background services.
      </p>
    ),
  },
  {
    title: "Thermal equilibrium",
    content: (
      <p>
        Run a 5-minute warmup render (discarded) before timing begins. This
        ensures the CPU/GPU has reached its steady-state thermal performance,
        avoiding turbo-boost skew.
      </p>
    ),
  },
  {
    title: "Multiple runs",
    content: (
      <p>
        Each benchmark is run a minimum of 3 times. The reported value is the{" "}
        <span className="font-medium text-foreground">median</span> of all runs
        (robust to outliers). Standard deviation is also recorded.
      </p>
    ),
  },
  {
    title: "Fresh process",
    content: (
      <p>
        Each run starts a fresh renderer process. No caching between runs.
      </p>
    ),
  },
  {
    title: "Sequential execution",
    content: (
      <p>
        Renderers are benchmarked one at a time, never concurrently.
      </p>
    ),
  },
  {
    title: "Version pinning",
    content: (
      <p>
        The exact version (commit hash or release tag) of each renderer is
        recorded and reported.
      </p>
    ),
  },
] as const;

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export function MethodologyPageContent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<FlaskConical className="h-12 w-12" />}
        title="Benchmark Methodology"
        subtitle="How RenderScope benchmarks are designed, conducted, and validated — ensuring fair, reproducible, and meaningful comparisons across rendering engines."
        accentColor="sky"
      />

      {/* ── Philosophy ───────────────────────────────────────── */}
      <section className="mt-16">
        <SectionTitle id="philosophy" icon={<Scale className="h-6 w-6" />}>
          Philosophy
        </SectionTitle>

        <Prose>
          <p>
            Rendering engine benchmarks are only useful if they are trustworthy.
            RenderScope&apos;s benchmark methodology is built on four core
            principles:
          </p>
        </Prose>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              icon: <Shield className="h-5 w-5" />,
              title: "Fairness",
              text: "Every renderer gets the same scene, the same resolution, the same hardware, and the same conditions. No renderer is given advantages through settings that favor its strengths.",
            },
            {
              icon: <Repeat className="h-5 w-5" />,
              title: "Reproducibility",
              text: "Every published benchmark includes full hardware specs, software versions, exact commands, and settings. Anyone can replicate the results.",
            },
            {
              icon: <Eye className="h-5 w-5" />,
              title: "Transparency",
              text: "The methodology is public, the tools are open source, the raw data is downloadable. Nothing is hidden.",
            },
            {
              icon: <Scale className="h-5 w-5" />,
              title: "Honesty",
              text: "Benchmarks have limitations, and we acknowledge them explicitly. See the Limitations section below.",
            },
          ].map((p, i) => (
            <motion.div
              key={p.title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.06,
                ease: "easeOut",
              }}
            >
              <div className="mb-2 text-sky-400">{p.icon}</div>
              <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {p.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Hardware Requirements ────────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="hardware" icon={<Cpu className="h-6 w-6" />}>
          Hardware Requirements
        </SectionTitle>

        <Prose>
          <p>
            Benchmarks are grouped by hardware profile. Each benchmark result is
            tagged with the exact hardware it was run on. Results from different
            hardware profiles are never directly compared in the same chart —
            they are always labeled and grouped by profile.
          </p>
        </Prose>

        <motion.div
          className="mt-6 rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Example Hardware Profile
          </h3>
          <div className="space-y-1.5 font-mono text-sm text-zinc-300">
            <p>
              <span className="text-muted-foreground">CPU: </span>AMD Ryzen 9
              7950X (16 cores / 32 threads)
            </p>
            <p>
              <span className="text-muted-foreground">GPU: </span>NVIDIA RTX
              4090 (24 GB VRAM)
            </p>
            <p>
              <span className="text-muted-foreground">RAM: </span>64 GB
              DDR5-5600
            </p>
            <p>
              <span className="text-muted-foreground">OS:{"  "}</span>Ubuntu
              22.04 LTS
            </p>
            <p>
              <span className="text-muted-foreground">Driver: </span>NVIDIA
              545.29.06, CUDA 12.3
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Settings Standardization ─────────────────────────── */}
      <section className="mt-20">
        <SectionTitle
          id="settings"
          icon={<FlaskConical className="h-6 w-6" />}
        >
          Settings Standardization
        </SectionTitle>

        <Prose>
          <p>
            All benchmarks use the following default parameters unless the
            renderer physically cannot operate with them:
          </p>
        </Prose>

        <div
          className="mt-6 overflow-x-auto rounded-lg border border-border/50"
          role="region"
          aria-label="Benchmark settings table, scrollable"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Parameter
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Default Value
                </th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground sm:table-cell">
                  Rationale
                </th>
              </tr>
            </thead>
            <tbody>
              {settingsRows.map((row) => (
                <tr
                  key={row.parameter}
                  className="border-b border-border/30 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {row.parameter}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {row.value}
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                    {row.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout className="mt-4">
          Renderer-specific overrides are documented per benchmark result and are
          only applied when a renderer physically cannot operate with the default
          settings (e.g., a renderer that only supports specific sample counts).
        </Callout>
      </section>

      {/* ── Fairness Protocol ────────────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="fairness" icon={<Shield className="h-6 w-6" />}>
          Fairness Protocol
        </SectionTitle>

        <Prose>
          <p>
            Every benchmark run follows this protocol to minimize external
            variance and ensure comparable results:
          </p>
        </Prose>

        <div className="mt-6">
          <StepSection steps={[...fairnessSteps]} />
        </div>
      </section>

      {/* ── Metric Definitions ───────────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="metrics" icon={<Eye className="h-6 w-6" />}>
          Metric Definitions
        </SectionTitle>

        {/* PSNR */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            PSNR{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Peak Signal-to-Noise Ratio)
            </span>
          </h3>
          <Prose>
            <p>
              Measures pixel-level fidelity between a test image and a reference
              image. Higher is better.
            </p>
          </Prose>
          <FormulaBlock
            label="Formula"
            formula="PSNR = 10 \u00b7 log\u2081\u2080(MAX\u00b2 / MSE)"
          />
          <Prose>
            <p>
              Where MAX is the maximum pixel value (1.0 for float images, 255
              for 8-bit) and MSE is the Mean Squared Error.
            </p>
            <p>
              <span className="font-medium text-foreground">Range:</span> 0 to
              \u221e dB. Typical values: 20\u201325 dB (visible differences),
              30\u201340 dB (good quality), 40+ dB (excellent).
            </p>
            <p>
              <span className="font-medium text-foreground">Best for:</span>{" "}
              Quick numerical comparison. Widely understood in the research
              community.
            </p>
            <p>
              <span className="font-medium text-foreground">Limitation:</span>{" "}
              Doesn&apos;t correlate perfectly with perceived visual quality — a
              small bright pixel shift can significantly reduce PSNR while being
              visually imperceptible.
            </p>
          </Prose>
        </motion.div>

        {/* SSIM */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            SSIM{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Structural Similarity Index)
            </span>
          </h3>
          <Prose>
            <p>
              Measures perceived structural similarity, accounting for
              luminance, contrast, and structure. Closer to 1.0 is better.
            </p>
          </Prose>
          <FormulaBlock
            label="Formula"
            formula="SSIM(x,y) = (2\u03bc\u2093\u03bc\u1d67 + C\u2081)(2\u03c3\u2093\u1d67 + C\u2082) / (\u03bc\u2093\u00b2 + \u03bc\u1d67\u00b2 + C\u2081)(\u03c3\u2093\u00b2 + \u03c3\u1d67\u00b2 + C\u2082)"
          />
          <Prose>
            <p>
              Where \u03bc is the mean, \u03c3 is variance/covariance, and
              C\u2081, C\u2082 are stabilization constants.
            </p>
            <p>
              <span className="font-medium text-foreground">Range:</span>{" "}
              \u22121 to 1 (typically 0 to 1). Values above 0.95 are generally
              considered excellent.
            </p>
            <p>
              <span className="font-medium text-foreground">Best for:</span>{" "}
              Perceptually-aligned comparison. Better than PSNR at predicting
              what humans notice.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Implementation:
              </span>{" "}
              Computed using scikit-image&apos;s{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                structural_similarity
              </code>{" "}
              with default parameters (window size 7, Gaussian weights).
            </p>
          </Prose>
        </motion.div>

        {/* LPIPS */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            LPIPS{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Learned Perceptual Image Patch Similarity)
            </span>
          </h3>
          <Prose>
            <p>
              Uses a deep neural network (VGG or AlexNet) to compare images in a
              perceptual feature space. Lower is better.
            </p>
            <p>
              <span className="font-medium text-foreground">Range:</span> 0 to
              ~1. Values below 0.1 indicate high similarity.
            </p>
            <p>
              <span className="font-medium text-foreground">Best for:</span>{" "}
              The most perceptually accurate metric available. Especially useful
              for comparing different rendering algorithms that produce
              structurally different but visually similar results.
            </p>
            <p>
              <span className="font-medium text-foreground">Requirement:</span>{" "}
              Requires PyTorch. Install via{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                pip install renderscope[ml]
              </code>
              .
            </p>
            <p>
              <span className="font-medium text-foreground">
                Implementation:
              </span>{" "}
              Uses the{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                torchmetrics
              </code>{" "}
              LPIPS implementation with AlexNet backbone (default).
            </p>
          </Prose>
        </motion.div>

        {/* MSE */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            MSE{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Mean Squared Error)
            </span>
          </h3>
          <Prose>
            <p>
              Average of squared pixel differences. Lower is better. The
              simplest image quality metric.
            </p>
          </Prose>
          <FormulaBlock
            label="Formula"
            formula="MSE = (1/N) \u00b7 \u03a3(I\u1d63\u1d49\u1da0 \u2212 I\u209c\u1d49\u209b\u209c)\u00b2"
          />
          <Prose>
            <p>
              <span className="font-medium text-foreground">Best for:</span>{" "}
              Raw numerical comparison and intermediate computation (PSNR is
              derived from MSE).
            </p>
            <p>
              <span className="font-medium text-foreground">Limitation:</span>{" "}
              Highly sensitive to outlier pixels; not perceptually meaningful on
              its own.
            </p>
          </Prose>
        </motion.div>

        {/* Render Time */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Timer className="h-4 w-4 text-sky-400" />
            Render Time
          </h3>
          <Prose>
            <p>
              Wall-clock time from render start to completion, in seconds.
              Excludes scene loading and file I/O.
            </p>
            <p>
              <span className="font-medium text-foreground">Measurement:</span>{" "}
              Captured via{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                time.perf_counter()
              </code>{" "}
              wrapping the renderer&apos;s core render call.
            </p>
            <p>
              <span className="font-medium text-foreground">Reported as:</span>{" "}
              Median of 3+ runs, with standard deviation.
            </p>
          </Prose>
        </motion.div>

        {/* Peak Memory */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <MemoryStick className="h-4 w-4 text-sky-400" />
            Peak Memory
          </h3>
          <Prose>
            <p>
              Maximum resident memory (RSS) during the render process, in
              megabytes.
            </p>
            <p>
              <span className="font-medium text-foreground">Measurement:</span>{" "}
              Sampled every 100ms via{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                psutil.Process().memory_info().rss
              </code>
              .
            </p>
            <p>
              <span className="font-medium text-foreground">Note:</span> GPU
              memory is reported separately when available (via{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-xs text-foreground/80">
                nvidia-smi
              </code>{" "}
              or equivalent).
            </p>
          </Prose>
        </motion.div>
      </section>

      {/* ── Reproducibility ──────────────────────────────────── */}
      <section className="mt-20">
        <SectionTitle id="reproducibility" icon={<Repeat className="h-6 w-6" />}>
          Reproducibility
        </SectionTitle>

        <Prose>
          <p>
            Every published benchmark can be reproduced by following these
            steps:
          </p>
        </Prose>

        <div className="mt-6">
          <StepSection
            steps={[
              {
                title: "Identify the benchmark",
                content: (
                  <p>
                    Each benchmark result on the website includes a unique ID
                    and links to this methodology page.
                  </p>
                ),
              },
              {
                title: "Install the CLI",
                content: <CodeBlock code="pip install renderscope" />,
              },
              {
                title: "Install the renderer(s)",
                content: (
                  <p>
                    Follow the renderer&apos;s own installation instructions,
                    linked from its{" "}
                    <Link
                      href="/explore"
                      className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
                    >
                      RenderScope profile page
                    </Link>
                    .
                  </p>
                ),
              },
              {
                title: "Download the scene",
                content: (
                  <CodeBlock code="renderscope download-scenes --scene cornell-box" />
                ),
              },
              {
                title: "Run the benchmark with matching settings",
                content: (
                  <CodeBlock code="renderscope benchmark --scene cornell-box --renderer pbrt --samples 1024 --width 1920 --height 1080" />
                ),
              },
              {
                title: "Compare results",
                content: (
                  <p>
                    The expected output includes render time, memory, and image
                    metrics against the reference.
                  </p>
                ),
              },
            ]}
          />
        </div>

        <Callout>
          If your results differ significantly from published benchmarks, this is
          expected for different hardware. File an issue only if results differ
          on the same hardware profile.
        </Callout>
      </section>

      {/* ── Limitations & Caveats ────────────────────────────── */}
      <section className="mt-20">
        <SectionTitle
          id="limitations"
          icon={<AlertTriangle className="h-6 w-6" />}
        >
          Limitations & Caveats
        </SectionTitle>

        <Prose>
          <p>
            Acknowledging what the benchmarks do not measure is as important as
            explaining what they do. This transparency is essential for correct
            interpretation of results.
          </p>
        </Prose>

        <div className="mt-6 space-y-4">
          {[
            {
              title: "Scene coverage",
              text: "The standard scenes (Cornell Box, Sponza, Stanford Bunny, Classroom, BMW, San Miguel, Veach MIS) test specific aspects of rendering but cannot cover every scenario. Results may not generalize to production workloads.",
            },
            {
              title: "Feature asymmetry",
              text: "Some renderers support features (volumetrics, subsurface scattering, spectral rendering) that others don\u2019t. Benchmarks test common-denominator capabilities unless otherwise noted.",
            },
            {
              title: "Configuration fairness",
              text: "While we use default integrator settings, some renderers may have better non-default configurations. Expert tuning is out of scope.",
            },
            {
              title: "Real-time vs. offline",
              text: "Comparing a 60-second path trace to a 16ms rasterization frame is fundamentally different. We separate these in the benchmark dashboard and note the rendering paradigm.",
            },
            {
              title: "Neural renderer specifics",
              text: "Neural renderers (NeRF, 3DGS) require per-scene training, which is fundamentally different from classical rendering. Training time and rendering time are reported separately.",
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              className="rounded-lg border border-border/30 bg-card/30 px-5 py-4"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
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
