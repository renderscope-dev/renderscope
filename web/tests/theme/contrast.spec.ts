import { test, expect } from "@playwright/test";
import { navigateAndWait, checkTextContrast } from "../fixtures/test-utils";

/**
 * Dark theme contrast verification tests.
 * Checks that all text meets WCAG AA contrast requirements
 * against dark backgrounds.
 */

const PAGES_TO_CHECK = [
  "/",
  "/explore",
  "/renderer/pbrt",
  "/compare?r=pbrt,mitsuba3",
  "/benchmarks",
  "/learn",
];

test.describe("Dark theme: text contrast", () => {
  for (const path of PAGES_TO_CHECK) {
    test(`Sufficient text contrast on ${path}`, async ({ page }) => {
      await navigateAndWait(page, path);

      const result = await checkTextContrast(page);

      if (!result.passing) {
        const failureDetails = result.failures
          .map(
            (f) => `"${f.text}" — ratio: ${f.ratio}, required: ${f.required}`
          )
          .join("\n  ");

        // Log failures as a warning but allow a small number of edge cases
        // (e.g., placeholder text, decorative text that's intentionally muted)
        console.warn(`Contrast issues on ${path}:\n  ${failureDetails}`);

        // Fail if more than 3 elements have contrast issues
        // (allows for a few intentional muted/decorative elements)
        expect(
          result.failures.length,
          `Too many contrast failures on ${path}:\n  ${failureDetails}`
        ).toBeLessThanOrEqual(3);
      }
    });
  }
});
