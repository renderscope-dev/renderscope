import { Page } from "@playwright/test";

/**
 * Wait for the page to be fully loaded and visually stable.
 * Critical for visual regression tests — all lazy-loaded images,
 * fonts, and animations must settle before screenshot capture.
 */
export async function waitForPageStable(page: Page): Promise<void> {
  // Wait for network to be idle (no pending requests)
  await page.waitForLoadState("networkidle");

  // Wait for any fonts to finish loading
  await page.evaluate(() => document.fonts.ready);

  // Wait a small fixed delay for CSS transitions/animations to settle
  // (Playwright's animations: 'disabled' config handles most, but not all)
  await page.waitForTimeout(500);
}

/**
 * Check that no element on the page causes horizontal overflow.
 * Returns the first offending element's tag/class if overflow exists.
 */
export async function checkNoHorizontalOverflow(page: Page): Promise<{
  hasOverflow: boolean;
  offendingElement?: string;
}> {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const allElements = document.querySelectorAll("*");

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1) {
        // +1 for sub-pixel tolerance
        const tag = el.tagName.toLowerCase();
        const cls = el.className?.toString().slice(0, 60) || "";
        return {
          hasOverflow: true,
          offendingElement: `<${tag} class="${cls}"> (right edge: ${Math.round(rect.right)}px, viewport: ${docWidth}px)`,
        };
      }
    }
    return { hasOverflow: false };
  });
}

/**
 * Get all text elements and verify they have sufficient contrast
 * against their backgrounds for WCAG AA compliance.
 * Returns any failing elements.
 */
export async function checkTextContrast(page: Page): Promise<{
  passing: boolean;
  failures: Array<{ text: string; ratio: number; required: number }>;
}> {
  return page.evaluate(() => {
    function getLuminance(r: number, g: number, b: number): number {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
    }

    function getContrastRatio(l1: number, l2: number): number {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function parseColor(color: string): [number, number, number] | null {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [
          parseInt(match[1]!),
          parseInt(match[2]!),
          parseInt(match[3]!),
        ];
      }
      return null;
    }

    const failures: Array<{
      text: string;
      ratio: number;
      required: number;
    }> = [];
    const textElements = document.querySelectorAll(
      "p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button"
    );

    for (const el of textElements) {
      const text = el.textContent?.trim();
      if (!text || text.length === 0) continue;

      const styles = window.getComputedStyle(el);
      const fgColor = parseColor(styles.color);
      const bgColor = parseColor(styles.backgroundColor);

      if (!fgColor || !bgColor) continue;
      // Skip if background is transparent (rgba with 0 alpha)
      if (styles.backgroundColor.includes("0)")) continue;

      const fgLum = getLuminance(...fgColor);
      const bgLum = getLuminance(...bgColor);
      const ratio = getContrastRatio(fgLum, bgLum);

      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = parseInt(styles.fontWeight);
      const isLargeText =
        fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const required = isLargeText ? 3.0 : 4.5; // WCAG AA

      if (ratio < required) {
        failures.push({
          text: text.slice(0, 50),
          ratio: Math.round(ratio * 100) / 100,
          required,
        });
      }
    }

    return { passing: failures.length === 0, failures: failures.slice(0, 10) };
  });
}

/**
 * Navigate to a page and wait for it to be ready for interaction/capture.
 */
export async function navigateAndWait(
  page: Page,
  path: string
): Promise<void> {
  await page.goto(path);
  await waitForPageStable(page);
}
