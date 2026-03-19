"use client";

import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureMatrixCellProps {
  value: boolean | null | undefined;
  rendererName: string;
  featureLabel: string;
}

/**
 * Renders a single cell in the feature matrix.
 *
 * - `true`  → green checkmark (Supported)
 * - `false` → red X (Not supported)
 * - `null`/`undefined` → gray dash (Not applicable / Unknown)
 *
 * This is the most frequently rendered component in the matrix
 * (~features × renderers), so it's kept lightweight.
 */
export function FeatureMatrixCell({
  value,
  rendererName,
  featureLabel,
}: FeatureMatrixCellProps) {
  if (value === true) {
    return (
      <td
        className={cn(
          "px-3 py-2 text-center",
          "bg-emerald-500/[0.04] transition-colors duration-150"
        )}
        aria-label={`${featureLabel}: Supported by ${rendererName}`}
      >
        <div className="flex items-center justify-center">
          <Check
            className="h-4 w-4 text-emerald-400"
            aria-hidden="true"
          />
        </div>
      </td>
    );
  }

  if (value === false) {
    return (
      <td
        className={cn(
          "px-3 py-2 text-center",
          "bg-red-500/[0.04] transition-colors duration-150"
        )}
        aria-label={`${featureLabel}: Not supported by ${rendererName}`}
      >
        <div className="flex items-center justify-center">
          <X
            className="h-4 w-4 text-red-400"
            aria-hidden="true"
          />
        </div>
      </td>
    );
  }

  return (
    <td
      className="px-3 py-2 text-center transition-colors duration-150"
      aria-label={`${featureLabel}: Not applicable for ${rendererName}`}
    >
      <div className="flex items-center justify-center">
        <Minus
          className="h-4 w-4 text-muted-foreground/50"
          aria-hidden="true"
        />
      </div>
    </td>
  );
}
