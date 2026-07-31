import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated axe-core WCAG 2.1 AA audit for all RenderScope pages.
 *
 * This test visits every public page, injects the axe-core engine, and
 * asserts zero violations.  Run with:
 *
 *   npx playwright test e2e/accessibility/axe-audit.spec.ts
 *
 * Pages that rely on dynamic data (renderer profiles, gallery scenes)
 * are tested via their listing pages rather than individual slugs,
 * since the static export may not be running during dev server tests.
 */

// All public pages to audit.
// Dynamic routes (e.g. /renderer/[slug]) are included with a known slug
// that exists in the data files.
const PAGES_TO_AUDIT = [
  { name: "Home", path: "/" },
  { name: "Explore", path: "/explore" },
  { name: "Compare", path: "/compare" },
  { name: "Gallery", path: "/gallery" },
  { name: "Benchmarks", path: "/benchmarks" },
  { name: "Learn", path: "/learn" },
  { name: "Learn — Glossary", path: "/learn/glossary" },
  { name: "Learn — Timeline", path: "/learn/timeline" },
  { name: "Docs", path: "/docs" },
  { name: "Docs — CLI", path: "/docs/cli" },
  { name: "Docs — API", path: "/docs/api" },
  { name: "Docs — Schema", path: "/docs/schema" },
  { name: "Docs — Contributing", path: "/docs/contributing" },
  { name: "Docs — Methodology", path: "/docs/methodology" },
  { name: "Docs — Citation", path: "/docs/citation" },
];

test.describe("Accessibility — axe-core WCAG 2.1 AA audit", () => {
  for (const page of PAGES_TO_AUDIT) {
    test(`${page.name} (${page.path}) has no WCAG 2.1 AA violations`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path, { waitUntil: "networkidle" });

      // Wait for next-themes to resolve and apply the theme class.
      //
      // Until it does, the document carries neither `light` nor `dark`, and
      // components styled for the dark palette paint over the light default
      // background. Scanning inside that window reports contrast failures that
      // do not exist once the theme lands — which is exactly what happened on
      // CI, where Google Fonts requests time out and stretch the gap far wider
      // than on a developer machine. A fixed sleep cannot cover that variance.
      await browserPage.waitForFunction(
        () => {
          const cls = document.documentElement.classList;
          return cls.contains("light") || cls.contains("dark");
        },
        undefined,
        { timeout: 15000 }
      );

      // Let webfonts settle where they can; never block the audit on them,
      // because CI runners frequently cannot reach fonts.gstatic.com.
      await browserPage
        .evaluate(() => document.fonts?.ready?.then(() => undefined))
        .catch(() => undefined);

      // Allow client-side hydration to settle
      await browserPage.waitForTimeout(1500);

      // Force-complete all Framer Motion animations before scanning.
      // Playwright's `animations: 'disabled'` only affects CSS animations —
      // JS-driven Framer Motion entrance animations (opacity/transform) can
      // still be mid-flight, causing false-positive contrast violations.
      // Using CSS !important overrides is more reliable than JS injection
      // because it persists across React re-renders and applies to elements
      // created after injection.
      await browserPage.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
          [style*="opacity"] {
            opacity: 1 !important;
          }
          [style*="transform"] {
            transform: none !important;
          }
        `,
      });
      // Brief settle after forcing animations to complete
      await browserPage.waitForTimeout(200);

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Exclude third-party widgets that we cannot control
        .exclude("#__next-build-indicator")
        .analyze();

      // Build a readable failure message listing each violation
      const violationMessages = results.violations.map((v) => {
        const nodes = v.nodes
          .map(
            (n) =>
              `  - ${n.html.slice(0, 120)}${n.html.length > 120 ? "…" : ""}\n    ${n.failureSummary}`
          )
          .join("\n");
        return `[${v.id}] ${v.help} (${v.impact})\n  ${v.helpUrl}\n${nodes}`;
      });

      expect(
        results.violations,
        `axe-core found ${results.violations.length} violation(s) on ${page.name}:\n\n${violationMessages.join("\n\n")}`
      ).toHaveLength(0);
    });
  }
});
