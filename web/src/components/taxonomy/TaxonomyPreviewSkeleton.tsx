"use client";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder for the TaxonomyPreview while D3 is being lazy-loaded.
 * Shows a pulsing dark surface with faint decorative dots arranged in a
 * loose cluster pattern to hint at the incoming graph visualization.
 */

// Pre-computed static dot positions — a loose constellation pattern
const SKELETON_DOTS = [
  // Cluster 1: left-center (path tracing — blue tones)
  { cx: "18%", cy: "35%", r: 5, color: "hsl(210, 100%, 65%)", delay: 0 },
  { cx: "22%", cy: "42%", r: 3.5, color: "hsl(210, 100%, 65%)", delay: 0.3 },
  { cx: "15%", cy: "48%", r: 4, color: "hsl(210, 100%, 65%)", delay: 0.1 },
  { cx: "25%", cy: "30%", r: 3, color: "hsl(195, 100%, 60%)", delay: 0.5 },

  // Cluster 2: center-top (rasterization — green tones)
  { cx: "45%", cy: "25%", r: 6, color: "hsl(142, 70%, 50%)", delay: 0.2 },
  { cx: "50%", cy: "32%", r: 4, color: "hsl(142, 70%, 50%)", delay: 0.4 },
  { cx: "42%", cy: "20%", r: 3, color: "hsl(142, 70%, 50%)", delay: 0.6 },

  // Cluster 3: right (neural — purple tones)
  { cx: "72%", cy: "38%", r: 5, color: "hsl(280, 85%, 65%)", delay: 0.1 },
  { cx: "78%", cy: "45%", r: 3.5, color: "hsl(260, 80%, 70%)", delay: 0.3 },
  { cx: "68%", cy: "32%", r: 4, color: "hsl(280, 85%, 65%)", delay: 0.5 },

  // Cluster 4: bottom-center (differentiable/volume — warm tones)
  { cx: "38%", cy: "65%", r: 4, color: "hsl(330, 85%, 60%)", delay: 0.2 },
  { cx: "55%", cy: "60%", r: 3, color: "hsl(25, 95%, 55%)", delay: 0.4 },
  { cx: "62%", cy: "68%", r: 3.5, color: "hsl(25, 95%, 55%)", delay: 0.6 },

  // Scattered singles (educational — amber)
  { cx: "85%", cy: "60%", r: 3, color: "hsl(45, 95%, 55%)", delay: 0.7 },
  { cx: "30%", cy: "72%", r: 2.5, color: "hsl(185, 80%, 55%)", delay: 0.8 },
] as const;

interface TaxonomyPreviewSkeletonProps {
  className?: string;
}

export function TaxonomyPreviewSkeleton({
  className,
}: TaxonomyPreviewSkeletonProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/5",
        "h-[280px] md:h-[340px] lg:h-[400px]",
        className
      )}
      aria-hidden="true"
    >
      {/* Subtle radial gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(240 6% 10%) 0%, hsl(240 6% 6%) 70%, transparent 100%)",
        }}
      />

      {/* Decorative dots */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {SKELETON_DOTS.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r * 0.3}
            fill={dot.color}
            opacity={0.15}
          >
            <animate
              attributeName="opacity"
              values="0.08;0.2;0.08"
              dur="3s"
              begin={`${dot.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Faint connecting lines between some dots */}
        <line x1="18%" y1="35%" x2="22%" y2="42%" stroke="white" strokeWidth="0.15" opacity="0.06" />
        <line x1="45%" y1="25%" x2="50%" y2="32%" stroke="white" strokeWidth="0.15" opacity="0.06" />
        <line x1="72%" y1="38%" x2="78%" y2="45%" stroke="white" strokeWidth="0.15" opacity="0.06" />
        <line x1="38%" y1="65%" x2="55%" y2="60%" stroke="white" strokeWidth="0.15" opacity="0.06" />
      </svg>

      {/* Center pulse indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/[0.03]" />
      </div>
    </div>
  );
}
