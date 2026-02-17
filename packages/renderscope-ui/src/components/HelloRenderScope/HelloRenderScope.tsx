import { VERSION } from "../../version";
import { TECHNIQUE_COLORS, type TechniqueId } from "../../constants";

export interface HelloRenderScopeProps {
  /** Optional title override. */
  title?: string;
  /** Optional tagline override. */
  tagline?: string;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * Demo component that verifies the full build pipeline works:
 * TypeScript → Rollup → ESM/CJS, CSS custom properties, Storybook.
 *
 * This component will be removed in Phase 22 when real components arrive.
 */
export function HelloRenderScope({
  title = "RenderScope UI",
  tagline = "Reusable components for rendering engine comparison",
  className,
}: HelloRenderScopeProps) {
  const techniques = Object.entries(TECHNIQUE_COLORS) as Array<
    [TechniqueId, string]
  >;

  return (
    <div
      className={`rs-hello ${className ?? ""}`.trim()}
      style={{
        background: "var(--rs-bg-card)",
        border: "1px solid var(--rs-border)",
        borderRadius: "var(--rs-radius-lg)",
        padding: "var(--rs-space-xl)",
        fontFamily: "var(--rs-font-sans)",
        color: "var(--rs-text)",
        maxWidth: 420,
      }}
    >
      <h2
        style={{
          fontSize: "var(--rs-font-size-xl)",
          fontWeight: 700,
          margin: 0,
          marginBottom: "var(--rs-space-xs)",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: "var(--rs-font-size-sm)",
          color: "var(--rs-text-muted)",
          margin: 0,
          marginBottom: "var(--rs-space-lg)",
        }}
      >
        {tagline}
      </p>

      <div
        style={{
          display: "flex",
          gap: "var(--rs-space-sm)",
          flexWrap: "wrap",
          marginBottom: "var(--rs-space-lg)",
        }}
      >
        {techniques.map(([id, color]) => (
          <span
            key={id}
            title={id.replace(/_/g, " ")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--rs-space-xs)",
              background: `${color}18`,
              color: color,
              fontSize: "var(--rs-font-size-xs)",
              padding: "2px 8px",
              borderRadius: "var(--rs-radius-full)",
              border: `1px solid ${color}33`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            {id.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "var(--rs-space-md)",
          borderTop: "1px solid var(--rs-border-subtle)",
        }}
      >
        <code
          style={{
            fontFamily: "var(--rs-font-mono)",
            fontSize: "var(--rs-font-size-xs)",
            color: "var(--rs-text-dim)",
          }}
        >
          v{VERSION}
        </code>
        <span
          style={{
            fontSize: "var(--rs-font-size-xs)",
            color: "var(--rs-metric-good)",
          }}
        >
          Pipeline OK
        </span>
      </div>
    </div>
  );
}
