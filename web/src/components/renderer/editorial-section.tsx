"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";

interface EditorialSectionProps {
  strengths: string[];
  limitations: string[];
  bestFor: string;
  notIdealFor?: string;
  longDescription: string;
}

function renderParagraphs(text: string) {
  // Split on double-newlines to get paragraphs, handle Markdown-style
  // bold (**text** or __text__), italic (*text* or _text_), and links [text](url)
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph, i) => {
    // Convert markdown-style formatting to HTML
    let html = paragraph
      // Escape potential HTML first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      // Italic: *text* or _text_ (but not inside words with underscores)
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>")
      // Links: [text](url) — only allow http/https URLs
      .replace(
        /\[(.+?)\]\((https?:\/\/.+?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
      )
      // Line breaks within a paragraph
      .replace(/\n/g, "<br />");

    return (
      <p
        key={i}
        className="text-sm text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export function EditorialSection({
  strengths,
  limitations,
  bestFor,
  notIdealFor,
  longDescription,
}: EditorialSectionProps) {
  return (
    <div>
      <SectionHeading
        title="Overview"
        icon={<BookOpen className="h-5 w-5" />}
        id="overview"
      />
      <motion.div
        className="rounded-xl border border-border/50 bg-card/50 p-6 md:p-8 space-y-8"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* ── Best For Callout ── */}
        <div className="space-y-3">
          <div className="rounded-lg border-l-4 border-emerald-500/70 bg-emerald-500/[0.06] px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-1">
                  Best for
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {bestFor}
                </p>
              </div>
            </div>
          </div>

          {notIdealFor && (
            <div className="rounded-lg border-l-4 border-amber-500/50 bg-amber-500/[0.04] px-5 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80 mb-1">
                    Not ideal for
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notIdealFor}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Strengths & Limitations Grid ── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Strengths */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2
                className="h-4 w-4 text-emerald-400"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-foreground">
                Strengths
              </h3>
            </div>
            <ul className="space-y-3" aria-label="Strengths">
              {strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {strength}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Limitations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle
                className="h-4 w-4 text-amber-400"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-foreground">
                Limitations
              </h3>
            </div>
            <ul className="space-y-3" aria-label="Limitations">
              {limitations.map((limitation, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {limitation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Background / History ── */}
        {longDescription && (
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">
              Background
            </h3>
            <div className="space-y-4">{renderParagraphs(longDescription)}</div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
