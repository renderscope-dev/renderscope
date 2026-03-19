import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";
import { ComparePage, ExplorePage } from "../fixtures/pages";

/**
 * Component-level visual regression tests.
 * Captures specific interactive components in known states.
 */

test.describe("Visual regression: complex components", () => {
  test("Feature matrix with multiple renderers", async ({ page }) => {
    const comparePage = new ComparePage(page);
    await comparePage.goto();
    await page.waitForLoadState("networkidle");

    // Use role selector to target only the tab button (avoids strict mode
    // violation — "text=Features" also matches description text and headings)
    const featuresTab = page.getByRole("tab", { name: "Features" });
    if (await featuresTab.isVisible()) {
      await featuresTab.click();
      await page.waitForTimeout(300);
    }

    const matrix = comparePage.featureMatrix;
    if (await matrix.isVisible()) {
      await expect(matrix).toHaveScreenshot("feature-matrix.png");
    }
  });

  test("Renderer card grid layout", async ({ page }) => {
    const explorePage = new ExplorePage(page);
    await explorePage.goto();
    await page.waitForLoadState("networkidle");

    // Wait for renderer cards to appear — Framer Motion staggered entrance
    // animations are JS-driven and not disabled by Playwright's CSS animation
    // setting, so we need explicit waits for content to settle.
    const cards = explorePage.rendererCards;
    await cards.first().waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500); // let staggered animations finish

    const grid = explorePage.rendererGrid;
    if (await grid.isVisible()) {
      await expect(grid).toHaveScreenshot("renderer-grid.png");
    }
  });

  test("Image comparison slider at midpoint", async ({ page }) => {
    await navigateAndWait(page, "/compare?r=pbrt,mitsuba3");

    // Navigate to Images tab (use role selector to avoid strict mode violation)
    const imagesTab = page.getByRole("tab", { name: "Images" });
    if (await imagesTab.isVisible()) {
      await imagesTab.click();
      await page.waitForTimeout(500);
    }

    const slider = page.locator('[data-testid="image-compare-slider"]');
    if (await slider.isVisible()) {
      await expect(slider).toHaveScreenshot("image-slider-midpoint.png");
    }
  });

  test("Navigation in desktop state", async ({ page }) => {
    await navigateAndWait(page, "/");
    const nav = page.locator("nav");
    await expect(nav).toHaveScreenshot("nav-desktop.png");
  });

  test("Footer", async ({ page }) => {
    await navigateAndWait(page, "/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(footer).toHaveScreenshot("footer.png");
  });
});
