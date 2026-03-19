import { cn, formatCount } from "@/lib/utils";
import { Box, Triangle, Lightbulb, Image as ImageIcon, Monitor } from "lucide-react";
import { ComplexityBadge } from "@/components/gallery/complexity-badge";
import type { SceneData } from "@/types/scene";

interface SceneMetadataProps {
  scene: SceneData;
  className?: string;
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}

export function SceneMetadata({ scene, className }: SceneMetadataProps) {
  const resolution = scene.resolution ?? [1920, 1080];

  const lightDescription =
    scene.lights === 1
      ? `1 light: ${scene.light_types.join(", ")}`
      : `${scene.lights} lights: ${scene.light_types.join(", ")}`;

  const stats: StatItem[] = [
    {
      icon: <Box className="h-4 w-4" />,
      label: "Vertices",
      value: formatCount(scene.vertices),
    },
    {
      icon: <Triangle className="h-4 w-4" />,
      label: "Faces",
      value: formatCount(scene.faces),
    },
    {
      icon: <Lightbulb className="h-4 w-4" />,
      label: "Lights",
      value: lightDescription,
    },
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: "Textures",
      value: scene.textures.toString(),
    },
    {
      icon: <Monitor className="h-4 w-4" />,
      label: "Resolution",
      value: `${resolution[0]} \u00D7 ${resolution[1]}`,
    },
  ];

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
          )}
        >
          <span className="shrink-0 text-muted-foreground/60">
            {stat.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
              {stat.label}
            </p>
            <p className="truncate text-sm font-mono text-foreground/80">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
      <div className="flex items-center">
        <ComplexityBadge complexity={scene.complexity} />
      </div>
    </div>
  );
}
