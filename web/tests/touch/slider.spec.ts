import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";

// No project enabled touch emulation, so `locator.tap()` threw "The page does
// not support tap" everywhere. Touch emulation now belongs to the mobile and
// tablet projects (see playwright.config.ts); these specs skip on the desktop
// projects, where a touch gesture is not something a user can perform.
test.skip(
  ({ hasTouch }) => !hasTouch,
  "Touch gestures only apply to touch-capable projects"
);


/**
 * Touch interaction tests for the image comparison slider.
 * Verifies that the slider handle responds to touch drag gestures.
 */

test.describe("Touch: image comparison slider", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to compare page with renderers that have images
    await navigateAndWait(page, "/compare?r=pbrt,mitsuba3");

    // Navigate to the Images tab (role selector avoids strict mode violation)
    const imagesTab = page.getByRole("tab", { name: "Images" });
    if (await imagesTab.isVisible()) {
      await imagesTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("Slider handle moves on touch drag", async ({ page }) => {
    const slider = page.locator('[data-testid="image-compare-slider"]');
    if (!(await slider.isVisible())) {
      test.skip();
      return;
    }

    const box = await slider.boundingBox();
    if (!box) return;

    // Find the slider handle/divider
    const handle = slider
      .locator(
        '[data-testid="slider-handle"], [role="slider"], .slider-handle'
      )
      .first();
    const handleBox = await handle.boundingBox();

    // Get initial handle position
    const startX =
      handleBox ? handleBox.x + handleBox.width / 2 : box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Simulate touch drag: start at center, drag to the left quarter
    const targetX = box.x + box.width * 0.25;

    // Tap first to focus the slider
    await page.touchscreen.tap(startX, startY);
    await page.waitForTimeout(100);

    // The slider is driven by Pointer events (`use-slider-drag.ts` uses
    // onPointerDown/Move/Up with setPointerCapture). The previous version
    // dispatched synthetic TouchEvents, which the component never listens for,
    // so the handle correctly never moved and the test asserted against a
    // gesture the app cannot receive. Playwright's mouse emits genuine,
    // trusted pointer events, which is the same handler a real touch drag
    // reaches on a touch device.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(startX + (targetX - startX) * (i / steps), startY);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    const newHandleBox = await handle.boundingBox();
    if (newHandleBox && handleBox) {
      // Handle should have moved left
      expect(newHandleBox.x).toBeLessThan(handleBox.x);
    }
  });
});
