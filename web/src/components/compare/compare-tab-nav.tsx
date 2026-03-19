"use client";

import { LayoutGrid, Images, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { announceToScreenReader } from "@/lib/a11y-utils";
import type { CompareTab } from "@/lib/compare-url-state";

interface CompareTabNavProps {
  activeTab: CompareTab;
  onTabChange: (tab: CompareTab) => void;
}

const TAB_DEFINITIONS: {
  key: CompareTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    key: "features",
    label: "Features",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "Compare capabilities and supported features",
  },
  {
    key: "images",
    label: "Images",
    icon: <Images className="h-4 w-4" />,
    description: "Compare rendered output visually",
  },
  {
    key: "performance",
    label: "Performance",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Compare benchmark results and metrics",
  },
];

/**
 * Tab navigation bar for the Compare page.
 * Uses custom styled tabs (not shadcn Tabs) for full control over
 * URL-driven state. Each tab click updates the URL via the parent's
 * onTabChange callback.
 */
export function CompareTabNav({ activeTab, onTabChange }: CompareTabNavProps) {
  return (
    <div
      data-testid="compare-tabs"
      className="border-b border-border/50"
      role="tablist"
      aria-label="Comparison sections"
    >
      <nav className="flex gap-1">
        {TAB_DEFINITIONS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              id={`tab-${tab.key}`}
              title={tab.description}
              onClick={() => {
                onTabChange(tab.key);
                announceToScreenReader(`${tab.label} tab selected`);
              }}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "rounded-t-md",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/30"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>

              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
