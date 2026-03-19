import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";

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

    // Perform a touch drag gesture via dispatched TouchEvents
    await page.evaluate(
      ({ sx, sy, tx, ty }) => {
        const el = document.elementFromPoint(sx, sy);
        if (!el) return;

        el.dispatchEvent(
          new TouchEvent("touchstart", {
            bubbles: true,
            touches: [
              new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy }),
            ],
          })
        );

        // Simulate intermediate move points for smooth drag
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          const x = sx + (tx - sx) * (i / steps);
          const y = sy + (ty - sy) * (i / steps);
          el.dispatchEvent(
            new TouchEvent("touchmove", {
              bubbles: true,
              touches: [
                new Touch({ identifier: 0, target: el, clientX: x, clientY: y }),
              ],
            })
          );
        }

        el.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            changedTouches: [
              new Touch({ identifier: 0, target: el, clientX: tx, clientY: ty }),
            ],
          })
        );
      },
      { sx: startX, sy: startY, tx: targetX, ty: startY }
    );

    await page.waitForTimeout(300);

    // Verify the slider position has changed
    const newHandleBox = await handle.boundingBox();
    if (newHandleBox && handleBox) {
      // Handle should have moved left
      expect(newHandleBox.x).toBeLessThan(handleBox.x);
    }
  });
});
