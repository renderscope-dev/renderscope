import {
  Terminal,
  ExternalLink,
  BookOpen,
  Code2,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { CodeBlock } from "@/components/renderer/code-block";

interface QuickStartProps {
  installCommand?: string;
  highlightedInstallHtml?: string;
  repository: string;
  documentation?: string;
  name: string;
}

export function QuickStart({
  installCommand,
  highlightedInstallHtml,
  repository,
  documentation,
  name,
}: QuickStartProps) {
  return (
    <div>
      <SectionHeading
        title="Quick Start"
        icon={<Terminal className="h-5 w-5" />}
        id="quick-start"
      />
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 md:p-8 space-y-5">
        {installCommand ? (
          <CodeBlock
            code={installCommand}
            highlightedHtml={highlightedInstallHtml}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-center">
            <Code2
              className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Visit the repository for installation instructions for{" "}
              <span className="font-medium text-foreground">{name}</span>.
            </p>
            <a
              href={repository}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View Repository
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )}

        {/* Additional guidance links */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {documentation && (
            <a
              href={documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Documentation
              <span aria-hidden="true">&rarr;</span>
            </a>
          )}
          <a
            href={repository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            Source Code
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
