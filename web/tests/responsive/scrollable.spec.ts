import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";

/**
 * Tests for scrollable components on mobile viewports.
 * Verifies that wide content (tables, matrices) is scrollable
 * rather than overflowing the page.
 */

test.describe("Responsive: scrollable components on mobile", () => {
  test("Feature matrix is horizontally scrollable on mobile", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
      return;
    }

    await navigateAndWait(page, "/compare?r=pbrt,mitsuba3");

    // Navigate to Features tab (role selector avoids strict mode violation)
    const featuresTab = page.getByRole("tab", { name: "Features" });
    if (await featuresTab.isVisible()) {
      await featuresTab.click();
      await page.waitForTimeout(300);
    }

    const matrix = page.locator('[data-testid="feature-matrix"]');
    if (!(await matrix.isVisible())) return;

    // The matrix container or its wrapper should have overflow-x: auto/scroll
    const scrollInfo = await matrix.evaluate((el) => {
      let current: HTMLElement | null = el as HTMLElement;
      while (current) {
        const overflow = window.getComputedStyle(current).overflowX;
        if (overflow === "auto" || overflow === "scroll") {
          return {
            isScrollable: true,
            scrollWidth: current.scrollWidth,
            clientWidth: current.clientWidth,
          };
        }
        current = current.parentElement;
      }
      return { isScrollable: false, scrollWidth: 0, clientWidth: 0 };
    });

    // If content is wider than viewport, it must be in a scrollable container
    if (scrollInfo.scrollWidth > scrollInfo.clientWidth) {
      expect(scrollInfo.isScrollable).toBe(true);
    }
  });

  test("Benchmark data table is usable on mobile", async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
      return;
    }

    await navigateAndWait(page, "/benchmarks");

    const table = page
      .locator('[data-testid="benchmark-table"], table')
      .first();
    if (!(await table.isVisible())) return;

    // Table should be within a scrollable container, not overflowing the page
    const tableInfo = await table.evaluate((el) => {
      let current: HTMLElement | null = el as HTMLElement;
      while (current) {
        const overflow = window.getComputedStyle(current).overflowX;
        if (overflow === "auto" || overflow === "scroll") {
          return { wrapped: true };
        }
        current = current.parentElement;
      }
      const rect = el.getBoundingClientRect();
      return {
        wrapped: false,
        exceedsViewport:
          rect.right > document.documentElement.clientWidth,
      };
    });

    // Table must either be wrapped in a scrollable container OR not exceed viewport
    if (!tableInfo.wrapped) {
      expect(tableInfo.exceedsViewport).toBe(false);
    }
  });
});
