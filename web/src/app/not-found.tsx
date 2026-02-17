import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="space-y-4">
        <SearchX className="mx-auto h-16 w-16 text-rose-500/50" />

        <p className="text-6xl font-bold text-white/20 sm:text-8xl">404</p>

        <div className="mx-auto h-px w-12 bg-gradient-to-r from-rose-500 to-rose-400" />

        <h1 className="text-2xl font-semibold text-white">Page not found</h1>

        <p className="text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go Home
          </Link>
          <Link
            href="/explore"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Explore Renderers
          </Link>
        </div>
      </div>
    </div>
  );
}
