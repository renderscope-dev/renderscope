import { test, expect } from "@playwright/test";

test.describe("Site Navigation", () => {
  test("landing page loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RenderScope/i);
    await expect(page.locator("text=RenderScope")).toBeVisible();
  });

  test("main navigation links are present", async ({ page }) => {
    await page.goto("/");

    // Desktop nav items
    const nav = page.locator("nav, header");
    await expect(nav.getByText("Explore")).toBeVisible();
    await expect(nav.getByText("Compare")).toBeVisible();
    await expect(nav.getByText("Gallery")).toBeVisible();
    await expect(nav.getByText("Benchmarks")).toBeVisible();
    await expect(nav.getByText("Learn")).toBeVisible();
    await expect(nav.getByText("Docs")).toBeVisible();
  });

  test("navigates to explore page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Explore" }).first().click();
    await page.waitForURL("**/explore");
    await expect(page.locator("h1, h2")).toContainText(/Explore|Renderers/i);
  });

  test("navigates to compare page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Compare" }).first().click();
    await page.waitForURL("**/compare");
    await expect(page.locator("h1, h2")).toContainText(/Compare/i);
  });

  test("navigates to gallery page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Gallery" }).first().click();
    await page.waitForURL("**/gallery");
    await expect(page.locator("h1, h2")).toContainText(/Gallery|Scenes/i);
  });

  test("navigates to benchmarks page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Benchmarks" }).first().click();
    await page.waitForURL("**/benchmarks");
    await expect(page.locator("h1, h2")).toContainText(/Benchmark/i);
  });

  test("footer is visible with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("Apache-2.0")).toBeVisible();
  });
});
