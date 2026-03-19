"use client";

import {
  Users,
  MessageSquare,
  MessagesSquare,
  Mail,
  HelpCircle,
  FileText,
  Play,
  GraduationCap,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import type { CommunityLinks as CommunityLinksType, Citation, Tutorial } from "@/types/renderer";
import { SectionHeading } from "@/components/shared/section-heading";
import { CopyButton } from "@/components/renderer/copy-button";
import { communityLinkConfig, tutorialTypeIcons } from "@/lib/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CommunityLinksProps {
  communityLinks?: CommunityLinksType;
  paper?: string;
  paperBibtex?: string;
  citations?: Citation[];
  tutorials?: Tutorial[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  MessagesSquare,
  Mail,
  HelpCircle,
  FileText,
  Play,
  GraduationCap,
};

function resolveCommunityUrl(key: string, value: string): string {
  if (key === "stackoverflow_tag") {
    // If it's just a tag name (no URL), build the SO URL
    if (!value.startsWith("http")) {
      return `https://stackoverflow.com/questions/tagged/${encodeURIComponent(value)}`;
    }
  }
  return value;
}

function hasAnyData(props: CommunityLinksProps): boolean {
  const { communityLinks, paper, paperBibtex, citations, tutorials } = props;

  if (paper || paperBibtex) return true;
  if (citations && citations.length > 0) return true;
  if (tutorials && tutorials.length > 0) return true;

  if (communityLinks) {
    return Object.entries(communityLinks).some(
      ([, v]) => v !== undefined && v !== ""
    );
  }

  return false;
}

export function CommunityLinks({
  communityLinks,
  paper,
  paperBibtex,
  citations,
  tutorials,
}: CommunityLinksProps) {
  if (!hasAnyData({ communityLinks, paper, paperBibtex, citations, tutorials })) {
    return null;
  }

  const communityEntries = communityLinks
    ? Object.entries(communityLinks).filter(
        ([, v]) => v !== undefined && v !== ""
      )
    : [];

  const hasCommunity = communityEntries.length > 0;
  const hasPaper = !!paper || !!paperBibtex;
  const hasCitations = citations && citations.length > 0;
  const hasTutorials = tutorials && tutorials.length > 0;

  return (
    <div>
      <SectionHeading
        title="Community & Resources"
        icon={<Users className="h-5 w-5" />}
        id="community"
      />
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 md:p-8 space-y-6">
        {/* Community Links */}
        {hasCommunity && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Community
            </h3>
            <ul className="space-y-2">
              {communityEntries.map(([key, value]) => {
                if (!value) return null;
                const config = communityLinkConfig[key];
                const label = config?.label ?? key;
                const iconName = config?.icon ?? "ExternalLink";
                const Icon = iconMap[iconName] ?? ExternalLink;
                const url = resolveCommunityUrl(key, value);

                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {label}
                      <ExternalLink
                        className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Paper & Citations */}
        {(hasPaper || hasCitations) && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Paper & Citations
            </h3>
            <div className="space-y-3">
              {paper && (
                <a
                  href={paper}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Original Paper
                  <ExternalLink
                    className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity"
                    aria-hidden="true"
                  />
                </a>
              )}

              {paperBibtex && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="bibtex" className="border-none">
                    <AccordionTrigger className="group py-0 text-sm text-muted-foreground hover:text-foreground hover:no-underline gap-2 [&>svg]:hidden">
                      <span className="inline-flex items-center gap-2.5">
                        <GraduationCap
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        Show BibTeX
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      <div className="relative rounded-lg border border-white/[0.06] bg-zinc-950 p-4">
                        <div className="absolute right-2 top-2">
                          <CopyButton text={paperBibtex} />
                        </div>
                        <pre
                          className="text-xs font-mono leading-relaxed text-zinc-300 overflow-x-auto pr-10"
                          aria-label="BibTeX citation"
                        >
                          <code>{paperBibtex}</code>
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {hasCitations && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                    Notable Publications
                  </p>
                  <ul className="space-y-1.5">
                    {citations!.map((c, i) => (
                      <li key={i}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-start gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FileText
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {c.title}
                            <span className="ml-1.5 text-xs text-muted-foreground/50">
                              ({c.year})
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tutorials & Resources */}
        {hasTutorials && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Tutorials & Resources
            </h3>
            <ul className="space-y-2">
              {tutorials!.map((t, i) => {
                const iconName = tutorialTypeIcons[t.type] ?? "FileText";
                const Icon = iconMap[iconName] ?? FileText;

                return (
                  <li key={i}>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {t.title}
                      <ExternalLink
                        className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
