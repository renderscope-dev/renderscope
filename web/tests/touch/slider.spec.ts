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
 *
 * What these cover is deliberately narrow: that real touch input reaches the
 * component, and that the component claims the gesture rather than letting the
 * browser treat a horizontal swipe as a scroll. Those are the two things only a
 * real engine can answer.
 *
 * The drag arithmetic itself — position mapping, clamping, and recovering from
 * a cancelled pointer — is covered by unit tests in
 * `packages/renderscope-ui/src/components/ImageCompare/ImageCompareSlider.test.tsx`.
 * It used to be asserted here with `page.mouse`, which Playwright does not
 * deliver into a touch-emulated Firefox context, so the assertion measured the
 * harness rather than the app.
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

  test("Slider handle moves on touch", async ({ page }) => {
    const slider = page.locator('[data-testid="image-compare-slider"]');
    await expect(slider).toBeVisible();

    // The slider sits well below the fold on a phone — 651px down a 568px-tall
    // viewport on the narrowest project. `page.touchscreen` takes viewport
    // coordinates and silently hits nothing when the target is off-screen, so
    // the gesture reached no element at all and the handle correctly never
    // moved. `locator.tap()` auto-scrolls; raw touch input does not.
    await slider.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const box = await slider.boundingBox();
    expect(box, "slider should have a layout box once visible").not.toBeNull();

    const handle = slider.locator('[role="slider"]').first();
    await expect(handle).toHaveAttribute("aria-valuenow", "50");

    // Touch the quarter point: a press maps straight onto a position, which is
    // what the first frame of any drag does.
    await page.touchscreen.tap(
      Math.round(box!.x + box!.width * 0.25),
      Math.round(box!.y + box!.height / 2)
    );
    await page.waitForTimeout(250);

    await expect(handle).toHaveAttribute("aria-valuenow", "25");

    const handleBox = await handle.boundingBox();
    expect(handleBox, "handle should be on screen").not.toBeNull();
    expect(handleBox!.x).toBeLessThan(box!.x + box!.width / 2);
  });

  test("Slider claims the horizontal gesture instead of surrendering it", async ({
    page,
  }) => {
    // The divider is dragged with a pointer. Under the default
    // `touch-action: auto` the compositor treats a horizontal swipe as a
    // scroll: it fires `pointercancel` immediately after `pointerdown` and
    // sends no `pointermove`, so on a phone the slider could be tapped but
    // never dragged. The npm package's `.rs-slider` has always set
    // `touch-action: none`; the web app's Tailwind copy had not.
    const slider = page.locator('[data-testid="image-compare-slider"]');
    await expect(slider).toBeVisible();

    const touchAction = await slider.evaluate(
      (el) => getComputedStyle(el).touchAction
    );
    expect(touchAction).toBe("none");
  });
});
