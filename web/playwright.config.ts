import { defineConfig, devices } from "@playwright/test";

/**
 * Viewport definitions used across all browser projects.
 * Each browser runs tests at all four viewport sizes.
 */
const VIEWPORTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1440, height: 900 }, // Standard laptop
  wide: { width: 1920, height: 1080 }, // Full HD
} as const;

export default defineConfig({
  testDir: "./tests",

  // Run tests in parallel across files but sequential within a file
  fullyParallel: true,

  // Fail the build on CI if test.only is left in
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI (flaky network, rendering timing)
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource exhaustion
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],

  // Global settings applied to every test
  use: {
    // Base URL for all page.goto() calls
    baseURL: "http://localhost:3000",

    // Capture screenshot on failure for debugging
    screenshot: "only-on-failure",

    // Capture trace on first retry for debugging
    trace: "on-first-retry",

    // Default navigation timeout
    navigationTimeout: 30000,

    // Default action timeout
    actionTimeout: 15000,
  },

  // Snapshot/screenshot comparison settings
  expect: {
    toHaveScreenshot: {
      // Allow 0.3% pixel difference to account for anti-aliasing
      // and sub-pixel rendering differences across browsers
      maxDiffPixelRatio: 0.003,

      // Threshold for individual pixel color difference (0-1)
      threshold: 0.2,

      // Animation stabilization — wait for animations to settle
      animations: "disabled",
    },
  },

  // Projects: one per browser × viewport combination
  projects: [
    // ── Chromium ──
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone SE"],
        channel: undefined, // Use bundled Chromium
      },
    },
    {
      name: "chromium-tablet",
      use: {
        browserName: "chromium",
        viewport: VIEWPORTS.tablet,
      },
    },
    {
      name: "chromium-desktop",
      use: {
        browserName: "chromium",
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: "chromium-wide",
      use: {
        browserName: "chromium",
        viewport: VIEWPORTS.wide,
      },
    },

    // ── Firefox ──
    {
      name: "firefox-mobile",
      use: {
        browserName: "firefox",
        viewport: VIEWPORTS.mobile,
      },
    },
    {
      name: "firefox-tablet",
      use: {
        browserName: "firefox",
        viewport: VIEWPORTS.tablet,
      },
    },
    {
      name: "firefox-desktop",
      use: {
        browserName: "firefox",
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: "firefox-wide",
      use: {
        browserName: "firefox",
        viewport: VIEWPORTS.wide,
      },
    },

    // ── WebKit (Safari) ──
    {
      name: "webkit-mobile",
      use: {
        ...devices["iPhone 13"],
      },
    },
    {
      name: "webkit-tablet",
      use: {
        ...devices["iPad (gen 7)"],
      },
    },
    {
      name: "webkit-desktop",
      use: {
        browserName: "webkit",
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: "webkit-wide",
      use: {
        browserName: "webkit",
        viewport: VIEWPORTS.wide,
      },
    },
  ],

  // Start the Next.js dev server before tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
