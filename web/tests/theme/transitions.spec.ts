import { test, expect } from "@playwright/test";
import { navigateAndWait } from "../fixtures/test-utils";
import { NavigationComponent } from "../fixtures/pages";

/**
 * Dark theme transition tests.
 * Verifies no white flash on load, theme toggle works,
 * and dark theme persists across page navigation.
 */

test.describe("Dark theme: no white flash", () => {
  test("Page loads in dark theme without white flash", async ({ page }) => {
    // Set up a mutation observer before navigation to detect any
    // briefly-visible white background
    await page.addInitScript(() => {
      (window as unknown as Record<string, boolean>).__whiteFlashDetected =
        false;

      const observer = new MutationObserver(() => {
        const bg = window.getComputedStyle(
          document.documentElement
        ).backgroundColor;
        const body = document.body
          ? window.getComputedStyle(document.body).backgroundColor
          : "";

        // Check if background is white/very light (luminance > 0.9)
        const isLight = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return false;
          const [r, g, b] = [
            parseInt(match[1]!),
            parseInt(match[2]!),
            parseInt(match[3]!),
          ];
          return (r + g + b) / 3 > 230; // Very light
        };

        if (isLight(bg) || isLight(body)) {
          (
            window as unknown as Record<string, boolean>
          ).__whiteFlashDetected = true;
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const whiteFlash = await page.evaluate(
      () =>
        (window as unknown as Record<string, boolean>).__whiteFlashDetected
    );
    expect(whiteFlash).toBe(false);
  });

  test("Theme toggle switches between dark and light correctly", async ({
    page,
  }) => {
    await navigateAndWait(page, "/");
    const nav = new NavigationComponent(page);

    const themeToggle = nav.themeToggle;
    if (!(await themeToggle.isVisible())) {
      // Theme toggle might not be visible (could be in a menu)
      test.skip();
      return;
    }

    // Verify initial dark theme
    const initialTheme = await page.evaluate(() => {
      return (
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.style.colorScheme === "dark"
      );
    });
    expect(initialTheme).toBe(true);

    // Toggle to light
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Verify light theme is applied
    const afterToggle = await page.evaluate(() => {
      return (
        document.documentElement.classList.contains("light") ||
        document.documentElement.getAttribute("data-theme") === "light" ||
        !document.documentElement.classList.contains("dark")
      );
    });
    expect(afterToggle).toBe(true);

    // Toggle back to dark
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Verify dark theme is restored
    const restored = await page.evaluate(() => {
      return (
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    });
    expect(restored).toBe(true);
  });

  test("Dark theme persists across page navigation", async ({ page }) => {
    await navigateAndWait(page, "/");

    // Confirm dark theme
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(isDark).toBe(true);

    // Navigate to another page
    await page.goto("/explore");
    await page.waitForLoadState("domcontentloaded");

    // Theme should still be dark
    const stillDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(stillDark).toBe(true);
  });
});
