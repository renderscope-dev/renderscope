import { test, expect } from "@playwright/test";

test.describe("Benchmarks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/benchmarks");
  });

  test("page loads with overview stats", async ({ page }) => {
    // Should have the page heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toContainText(/Benchmark/i);
  });

  test("data table is present with rows", async ({ page }) => {
    // Wait for table to load
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // Should have at least one data row
    const rows = table.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("hardware profile cards are visible", async ({ page }) => {
    // Hardware profiles section
    const hwSection = page.locator("text=/Hardware|Profile/i").first();
    await expect(hwSection).toBeVisible({ timeout: 10000 });
  });

  test("methodology section exists", async ({ page }) => {
    // Scroll down to find methodology
    const methodology = page.locator("text=/Methodology|methodology/i");
    const count = await methodology.count();
    expect(count).toBeGreaterThan(0);
  });
});
