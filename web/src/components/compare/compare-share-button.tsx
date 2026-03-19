"use client";

import { useCallback } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CompareShareButtonProps {
  className?: string;
}

/**
 * Copies the current page URL (including all query params) to the clipboard.
 * Shows a toast notification on success via sonner.
 */
export function CompareShareButton({ className }: CompareShareButtonProps) {
  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Comparison link copied to clipboard", {
        duration: 2500,
        icon: <Check className="h-4 w-4" />,
      });
    } catch {
      // Fallback for browsers that don't support clipboard API
      toast.error("Failed to copy link");
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      aria-label="Share comparison link"
      className={cn(
        "gap-1.5 border-border/60 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
