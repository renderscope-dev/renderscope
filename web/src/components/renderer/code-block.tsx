import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/renderer/copy-button";

interface CodeBlockProps {
  code: string;
  highlightedHtml?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  highlightedHtml,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border border-white/[0.06] bg-zinc-950",
        className
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <CopyButton text={code} />
      </div>
      <div
        role="region"
        aria-label="Code snippet"
        tabIndex={0}
        className={cn(
          "overflow-x-auto p-4 pr-12",
          showLineNumbers && "[&_code]:[counter-reset:line] [&_.line]:before:mr-4 [&_.line]:before:inline-block [&_.line]:before:w-4 [&_.line]:before:text-right [&_.line]:before:text-zinc-600 [&_.line]:before:[content:counter(line)] [&_.line]:before:[counter-increment:line]"
        )}
      >
        {highlightedHtml ? (
          <div
            className="text-sm font-mono leading-relaxed [&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!bg-transparent"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="text-sm font-mono leading-relaxed">
            <code className="text-zinc-300">{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
