// ═══════════════════════════════════════════════════════════════
// JSON-LD STRUCTURED DATA COMPONENT — Phase 29
// Server component that injects schema.org data into the page.
// Renders a <script type="application/ld+json"> tag in the body.
// ═══════════════════════════════════════════════════════════════

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
