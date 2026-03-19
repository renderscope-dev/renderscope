import { cn } from "@/lib/utils";

interface FormulaBlockProps {
  /** The formula text, using Unicode math symbols */
  formula: string;
  /** Optional label shown above the formula */
  label?: string;
  className?: string;
}

export function FormulaBlock({ formula, label, className }: FormulaBlockProps) {
  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-2 border-sky-500/50 bg-card/60 px-5 py-4",
        className
      )}
    >
      {label && (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <p className="font-mono text-sm leading-relaxed text-foreground/90 sm:text-base">
        {formula}
      </p>
    </div>
  );
}
