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

    // The drawer is `w-80` (320px). On the narrowest mobile viewport it spans
    // the full width, so there is no backdrop left to tap — dismissal there is
    // the close button or Escape, both of which Radix wires up. Tap outside
    // only when an outside actually exists.
    const box = await nav.mobileDrawer.boundingBox();
    expect(box, "drawer should be on screen before dismissing it").not.toBeNull();
    const viewportWidth = page.viewportSize()?.width ?? 0;

    if (box!.x > 8) {
      await page.touchscreen.tap(Math.round(box!.x / 2), Math.round(box!.y + box!.height / 2));
    } else {
      expect(
        Math.round(box!.width),
        "drawer spans the viewport, so Escape is the dismissal path"
      ).toBeGreaterThanOrEqual(viewportWidth - 1);
      await page.keyboard.press("Escape");
    }

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
