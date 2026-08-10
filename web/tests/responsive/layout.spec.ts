import { test, expect } from "@playwright/test";
import {
  navigateAndWait,
  checkNoHorizontalOverflow,
} from "../fixtures/test-utils";

/**
 * Responsive layout tests.
 * Verifies no horizontal overflow, correct navigation behavior,
 * and grid reflow at all viewport sizes.
 */

const ALL_PAGES = [
  "/",
  "/explore",
  "/renderer/pbrt",
  "/compare?r=pbrt,mitsuba3",
  "/gallery",
  "/benchmarks",
  "/learn",
  "/docs",
];

test.describe("Responsive layout: no horizontal overflow", () => {
  for (const path of ALL_PAGES) {
    test(`No overflow on ${path}`, async ({ page }) => {
      await navigateAndWait(page, path);

      const result = await checkNoHorizontalOverflow(page);

      expect(
        result.hasOverflow,
        `Horizontal overflow detected on ${path}: ${result.offendingElement || "unknown element"}`
      ).toBe(false);
    });
  }
});

test.describe("Responsive layout: navigation behavior", () => {
  test("Desktop: horizontal nav is visible, hamburger is hidden", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width < 1024) {
      test.skip();
      return;
    }

    await navigateAndWait(page, "/");

    // Desktop nav links should be visible
    const navLinks = page.locator("nav a");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(3);

    // Hamburger button should not be visible on desktop
    const hamburger = page.locator(
      '[data-testid="mobile-menu-button"], button[aria-label*="menu" i]'
    );
    if ((await hamburger.count()) > 0) {
      await expect(hamburger.first()).not.toBeVisible();
    }
  });

  test("Mobile: hamburger is visible, opens drawer with nav links", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
      return;
    }

    await navigateAndWait(page, "/");

    // Hamburger should be visible
    const hamburger = page.locator(
      '[data-testid="mobile-menu-button"], button[aria-label*="menu" i]'
    );
    await expect(hamburger.first()).toBeVisible();

    // Click hamburger
    await hamburger.first().click();
    await page.waitForTimeout(400);

    // Drawer should appear with nav links
    const drawer = page.locator(
      '[data-testid="mobile-drawer"], [role="dialog"]'
    );
    await expect(drawer.first()).toBeVisible();

    // Drawer should contain navigation links
    const drawerLinks = drawer.first().locator("a");
    const linkCount = await drawerLinks.count();
    expect(linkCount).toBeGreaterThan(3);
  });

  test("Mobile: hamburger drawer closes on link click", async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
      return;
    }

    await navigateAndWait(page, "/");

    const hamburger = page.locator(
      '[data-testid="mobile-menu-button"], button[aria-label*="menu" i]'
    );
    await hamburger.first().click();
    await page.waitForTimeout(400);

    const drawer = page.locator(
      '[data-testid="mobile-drawer"], [role="dialog"]'
    );
    // The first <a> in the drawer is the RenderScope logo, which links to "/"
    // — the page already open. Same-route navigation is a no-op, so the
    // close-on-route-change never fired and this asserted against a drawer
    // that was never asked to close. Click an actual destination instead.
    await drawer.first().getByRole("link", { name: /^Explore/ }).click();

    await expect(page).toHaveURL(/\/explore/);
    await expect(drawer.first()).not.toBeVisible();
  });
});

test.describe("Responsive layout: grid reflow", () => {
  test("Renderer cards reflow from multi-column to single column on mobile", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport) return;

    await navigateAndWait(page, "/explore");

    const grid = page.locator('[data-testid="renderer-grid"]');
    if (!(await grid.isVisible())) return;

    if (viewport.width <= 640) {
      // On mobile, cards should stack vertically
      const cards = page.locator('[data-testid="renderer-card"]');
      if ((await cards.count()) >= 2) {
        const firstRect = await cards.first().boundingBox();
        const secondRect = await cards.nth(1).boundingBox();

        if (firstRect && secondRect) {
          // Second card should be below the first
          expect(secondRect.y).toBeGreaterThanOrEqual(
            firstRect.y + firstRect.height - 5
          );
        }
      }
    }
  });
});
