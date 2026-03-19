import "@testing-library/jest-dom/vitest";

// ═══════════════════════════════════════════════════════════════
// BROWSER API MOCKS
// jsdom doesn't provide these — stub them for component tests.
// ═══════════════════════════════════════════════════════════════

// ImageData polyfill — jsdom doesn't provide it, but our
// image-processing functions create ImageData objects directly.
if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace = "srgb";

    constructor(
      widthOrData: number | Uint8ClampedArray,
      heightOrWidth: number,
      maybeHeight?: number,
    ) {
      if (widthOrData instanceof Uint8ClampedArray) {
        this.data = widthOrData;
        this.width = heightOrWidth;
        this.height = maybeHeight ?? (widthOrData.length / 4 / heightOrWidth);
      } else {
        this.width = widthOrData;
        this.height = heightOrWidth;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  }
  (globalThis as Record<string, unknown>).ImageData = ImageDataPolyfill;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver stub — used by Framer Motion and lazy-loading
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(
    private callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {
    // Make callback available for manual triggering in tests
    void this.callback;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = MockIntersectionObserver;

// ResizeObserver stub — used by chart components and RegionZoom
class MockResizeObserver implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver = MockResizeObserver;

// navigator.clipboard stub
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});

// Suppress Framer Motion animation warnings in test output
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});
