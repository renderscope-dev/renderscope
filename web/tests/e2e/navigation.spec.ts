import { test, expect } from "@playwright/test";

test.describe("Site Navigation", () => {
  test("landing page loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RenderScope/i);
    await expect(page.locator("h1").first()).toBeVisible();
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
    await page.waitForURL(/\/explore\/?$/);
    await expect(
      page.locator("h1, h2").filter({ hasText: /Explore|Renderers/i }).first()
    ).toBeVisible();
  });

  test("navigates to compare page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Compare" }).first().click();
    await page.waitForURL(/\/compare\/?$/);
    await expect(
      page.locator("h1, h2").filter({ hasText: /Compare/i }).first()
    ).toBeVisible();
  });

  test("navigates to gallery page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Gallery" }).first().click();
    await page.waitForURL(/\/gallery\/?$/);
    await expect(
      page.locator("h1, h2").filter({ hasText: /Gallery|Scenes/i }).first()
    ).toBeVisible();
  });

  test("navigates to benchmarks page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Benchmarks" }).first().click();
    await page.waitForURL(/\/benchmarks\/?$/);
    await expect(
      page.locator("h1, h2").filter({ hasText: /Benchmark/i }).first()
    ).toBeVisible();
  });

  test("footer is visible with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("Apache-2.0")).toBeVisible();
  });
});
