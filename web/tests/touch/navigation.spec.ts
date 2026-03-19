import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";
import { NavigationComponent } from "../fixtures/pages";

/**
 * Touch interaction tests for mobile navigation.
 * Verifies hamburger menu tap, drawer close, and link navigation via touch.
 */

test.describe("Touch: mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
    }
  });

  test("Hamburger menu opens on tap", async ({ page }) => {
    await navigateAndWait(page, "/");
    const nav = new NavigationComponent(page);

    const hamburger = nav.hamburgerButton;
    if (!(await hamburger.isVisible())) return;

    // Tap the hamburger
    await hamburger.tap();
    await page.waitForTimeout(400);

    // Mobile drawer should be visible
    const drawer = nav.mobileDrawer;
    await expect(drawer).toBeVisible();
  });

  test("Mobile drawer closes on outside tap", async ({ page }) => {
    await navigateAndWait(page, "/");
    const nav = new NavigationComponent(page);

    await nav.hamburgerButton.tap();
    await page.waitForTimeout(400);

    // Tap outside the drawer (on the overlay/backdrop)
    const overlay = page.locator(
      '[data-testid="drawer-overlay"], .fixed.inset-0, [role="dialog"] + div'
    );
    if (await overlay.isVisible()) {
      await overlay.tap();
    } else {
      // Tap in the top-left corner (outside drawer)
      await page.touchscreen.tap(10, 10);
    }

    await page.waitForTimeout(400);
    await expect(nav.mobileDrawer).not.toBeVisible();
  });

  test("Navigation links work via touch on mobile", async ({ page }) => {
    await navigateAndWait(page, "/");
    const nav = new NavigationComponent(page);

    await nav.hamburgerButton.tap();
    await page.waitForTimeout(400);

    // Find the "Explore" link in the drawer and tap it
    const exploreLink = page
      .locator(
        '[data-testid="mobile-drawer"] a[href*="explore"], [role="dialog"] a[href*="explore"]'
      )
      .first();
    if (await exploreLink.isVisible()) {
      await exploreLink.tap();
      await page.waitForLoadState("networkidle");

      // Should have navigated to the explore page
      expect(page.url()).toContain("/explore");
    }
  });
});
