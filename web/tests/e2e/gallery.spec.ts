import { test, expect } from "@playwright/test";

test.describe("Gallery Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery");
  });

  test("page loads with scene cards", async ({ page }) => {
    // Should display at least one scene
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Should have scene cards/links
    const links = page.locator("a[href*='/gallery/']");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test("scene cards display complexity badges", async ({ page }) => {
    // Wait for page content
    await page.waitForTimeout(1000);

    // Complexity badges should be present
    const badges = page.locator(
      "text=/trivial|low|medium|high|extreme/i",
    );
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a scene card navigates to detail page", async ({ page }) => {
    // `:visible` matters on mobile: the first `a[href*='/gallery/']` in the DOM
    // is not rendered at narrow widths, so selecting it positionally picked an
    // element that could never become visible.
    const sceneLink = page.locator("a[href*='/gallery/']:visible").first();
    await expect(sceneLink).toBeVisible({ timeout: 10000 });

    const href = await sceneLink.getAttribute("href");
    await sceneLink.click();

    if (href) {
      await page.waitForURL(`**${href}`);
      expect(page.url()).toContain("/gallery/");
    }
  });
});
