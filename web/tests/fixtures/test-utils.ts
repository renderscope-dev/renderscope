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
    const root = document.documentElement;
    const docWidth = root.clientWidth;

    // Horizontal overflow is a property of the page, not of any one box: it
    // means the document actually scrolls sideways. Checking that first is
    // what makes this test meaningful.
    //
    // Scanning every element's bounding rect on its own reports false
    // positives, because `getBoundingClientRect()` returns the full geometry
    // of a box even when an ancestor clips it. The hero's decorative light
    // rays are `w-[250%]` inside an `overflow-hidden` wrapper — 10,659px wide
    // on paper, entirely invisible in practice, and causing no scrollbar.
    if (root.scrollWidth <= docWidth + 1) {
      return { hasOverflow: false };
    }

    /** True when some ancestor clips this element horizontally. */
    const isClipped = (el: Element): boolean => {
      let node = el.parentElement;
      while (node) {
        const overflowX = window.getComputedStyle(node).overflowX;
        if (overflowX === "hidden" || overflowX === "clip") return true;
        node = node.parentElement;
      }
      return false;
    };

    // The page does scroll — name the widest unclipped element responsible.
    let worst: { el: Element; right: number } | null = null;
    for (const el of document.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.right <= docWidth + 1) continue;
      if (isClipped(el)) continue;
      if (!worst || rect.right > worst.right) worst = { el, right: rect.right };
    }

    if (!worst) {
      return {
        hasOverflow: true,
        offendingElement:
          `document scrollWidth ${root.scrollWidth}px exceeds clientWidth ` +
          `${docWidth}px, but no unclipped element was found`,
      };
    }

    const tag = worst.el.tagName.toLowerCase();
    const cls = worst.el.className?.toString().slice(0, 60) || "";
    return {
      hasOverflow: true,
      offendingElement: `<${tag} class="${cls}"> (right edge: ${Math.round(worst.right)}px, viewport: ${docWidth}px)`,
    };
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

    /** Parse an `rgb()`/`rgba()` string into [r, g, b, a]. */
    function parseColor(
      color: string
    ): [number, number, number, number] | null {
      const match = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/
      );
      if (!match) return null;
      return [
        parseInt(match[1]!),
        parseInt(match[2]!),
        parseInt(match[3]!),
        match[4] === undefined ? 1 : parseFloat(match[4]),
      ];
    }

    /** Composite a translucent colour over an opaque backdrop. */
    function composite(
      fg: [number, number, number, number],
      bg: [number, number, number]
    ): [number, number, number] {
      const a = fg[3];
      return [
        fg[0] * a + bg[0] * (1 - a),
        fg[1] * a + bg[1] * (1 - a),
        fg[2] * a + bg[2] * (1 - a),
      ];
    }

    /**
     * Resolve what an element is actually drawn against.
     *
     * Backgrounds are frequently translucent — technique badges paint a
     * 10%-alpha wash of their own hue — so the alpha has to be composited
     * against whatever is behind it. The previous version discarded the alpha
     * channel and compared a badge's text against its own undiluted colour,
     * reporting a contrast ratio of exactly 1 for text that renders fine.
     */
    function effectiveBackground(
      start: Element
    ): [number, number, number] {
      const layers: Array<[number, number, number, number]> = [];
      let node: Element | null = start;
      while (node) {
        const parsed = parseColor(window.getComputedStyle(node).backgroundColor);
        if (parsed && parsed[3] > 0) {
          layers.push(parsed);
          if (parsed[3] >= 1) break;
        }
        node = node.parentElement;
      }
      // Default backdrop is the canvas colour; browsers render it white.
      let result: [number, number, number] = [255, 255, 255];
      for (let i = layers.length - 1; i >= 0; i--) {
        result = composite(layers[i]!, result);
      }
      return result;
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
      if (!fgColor) continue;

      // Gradient headings use `background-clip: text` with a transparent
      // colour; the glyphs are painted by the background, so a foreground
      // contrast ratio is meaningless here. axe-core skips these too.
      if (fgColor[3] === 0) continue;

      // Elements whose text is fully clipped away contribute nothing visible.
      if (styles.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue;

      const bgColor = effectiveBackground(el);
      const fgOverBg = composite(fgColor, bgColor);

      const fgLum = getLuminance(...fgOverBg);
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
