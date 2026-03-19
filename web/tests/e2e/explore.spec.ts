import { test, expect } from "@playwright/test";

test.describe("Explore Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/explore");
  });

  test("page loads with renderer cards", async ({ page }) => {
    // Should have at least one renderer card
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search bar is functional", async ({ page }) => {
    const searchInput = page.getByPlaceholderText("Search renderers...");
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill("PBRT");

    // Wait for URL to update with search param
    await page.waitForTimeout(500); // debounce
    await expect(page).toHaveURL(/q=PBRT|q=pbrt/i);
  });

  test("view toggle switches between grid and list", async ({ page }) => {
    // Should start in grid view by default
    const listViewBtn = page.getByLabel("List view");
    await expect(listViewBtn).toBeVisible();

    // Switch to list view
    await listViewBtn.click();
    await expect(page).toHaveURL(/view=list/);
  });

  test("filter sidebar is visible on desktop", async ({ page }) => {
    // Look for filter section
    const filterAside = page.locator("[aria-label='Filter renderers']");
    // On desktop viewport, should be visible
    if (page.viewportSize()?.width && page.viewportSize()!.width >= 1024) {
      await expect(filterAside).toBeVisible();
    }
  });

  test("clicking a renderer card navigates to detail page", async ({
    page,
  }) => {
    // Wait for cards to load
    const firstCard = page.locator("article").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Click the first card's link
    const cardLink = firstCard.locator("a").first();
    const href = await cardLink.getAttribute("href");
    await cardLink.click();

    // Should navigate to a renderer detail page
    if (href) {
      await page.waitForURL(`**${href}`);
      expect(page.url()).toContain("/renderer/");
    }
  });
});
