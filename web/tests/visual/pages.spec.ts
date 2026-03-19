import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";

/**
 * Visual regression tests for all key pages.
 * Captures full-page and above-the-fold screenshots per browser×viewport.
 *
 * Generate baselines: npx playwright test tests/visual/ --update-snapshots
 */

const PAGES_TO_TEST = [
  { name: "landing", path: "/" },
  { name: "explore", path: "/explore" },
  { name: "renderer-profile", path: "/renderer/pbrt" },
  { name: "compare", path: "/compare?r=pbrt,mitsuba3" },
  { name: "gallery", path: "/gallery" },
  { name: "benchmarks", path: "/benchmarks" },
  { name: "learn", path: "/learn" },
] as const;

for (const { name, path } of PAGES_TO_TEST) {
  test.describe(`Visual regression: ${name}`, () => {
    test(`${name} — full page screenshot`, async ({ page }) => {
      await navigateAndWait(page, path);

      await expect(page).toHaveScreenshot(`${name}-full.png`, {
        fullPage: true,
      });
    });

    test(`${name} — above-the-fold screenshot`, async ({ page }) => {
      await navigateAndWait(page, path);

      await expect(page).toHaveScreenshot(`${name}-viewport.png`, {
        fullPage: false,
      });
    });
  });
}
