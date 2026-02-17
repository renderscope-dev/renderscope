import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  showIcon?: boolean;
  className?: string;
}

export function Logo({ showIcon = true, className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
    >
      {showIcon && (
        <div className="relative flex h-8 w-8 items-center justify-center">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
            <circle
              cx="16"
              cy="16"
              r="5"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/70"
            />
            <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
            <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
            <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
            <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" className="text-primary" />
          </svg>
        </div>
      )}
      <span className="text-lg font-semibold tracking-tight">
        Render<span className="text-primary">Scope</span>
      </span>
    </Link>
  );
}
