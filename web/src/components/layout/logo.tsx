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
            <defs>
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="hsl(252, 62%, 52%)" />
                <stop offset="100%" stopColor="hsl(280, 70%, 55%)" />
              </linearGradient>
            </defs>
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="url(#logo-gradient)"
              strokeWidth="2"
            />
            <circle
              cx="16"
              cy="16"
              r="5"
              stroke="url(#logo-gradient)"
              strokeWidth="1.5"
              opacity="0.7"
            />
            <line x1="16" y1="2" x2="16" y2="8" stroke="url(#logo-gradient)" strokeWidth="1.5" opacity="0.5" />
            <line x1="16" y1="24" x2="16" y2="30" stroke="url(#logo-gradient)" strokeWidth="1.5" opacity="0.5" />
            <line x1="2" y1="16" x2="8" y2="16" stroke="url(#logo-gradient)" strokeWidth="1.5" opacity="0.5" />
            <line x1="24" y1="16" x2="30" y2="16" stroke="url(#logo-gradient)" strokeWidth="1.5" opacity="0.5" />
            <circle cx="16" cy="16" r="1.5" fill="url(#logo-gradient)" />
          </svg>
        </div>
      )}
      <span className="font-display text-lg font-semibold tracking-tight">
        Render<span className="text-primary">Scope</span>
      </span>
    </Link>
  );
}
