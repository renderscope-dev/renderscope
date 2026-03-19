/**
 * Global test setup for renderscope-ui.
 *
 * Provides polyfills and mocks for browser APIs that jsdom doesn't implement:
 * ResizeObserver, IntersectionObserver, matchMedia, Canvas 2D, Image, URL,
 * ImageData.
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import ResizeObserverPolyfill from "resize-observer-polyfill";

// ---------------------------------------------------------------------------
// Cleanup after each test
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Polyfill ImageData (not available in jsdom)
// ---------------------------------------------------------------------------

if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace = "srgb";

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number,
    ) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? dataOrWidth.length / (widthOrHeight * 4);
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  }

  globalThis.ImageData =
    ImageDataPolyfill as unknown as typeof ImageData;
}

// ---------------------------------------------------------------------------
// Polyfill ResizeObserver
// ---------------------------------------------------------------------------

global.ResizeObserver = ResizeObserverPolyfill;

// ---------------------------------------------------------------------------
// Mock matchMedia (not available in jsdom)
// ---------------------------------------------------------------------------

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Mock IntersectionObserver (not available in jsdom)
// ---------------------------------------------------------------------------

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "",
  thresholds: [],
  takeRecords: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// ---------------------------------------------------------------------------
// Mock HTMLCanvasElement.getContext
// ---------------------------------------------------------------------------

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(
  (contextId: string) => {
    if (contextId === "2d") {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
          return new ImageData(w, h);
        }),
        putImageData: vi.fn(),
        createImageData: vi.fn((w: number, h: number) => {
          return new ImageData(w, h);
        }),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        canvas: { width: 100, height: 100 },
        scale: vi.fn(),
        translate: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        clip: vi.fn(),
        rect: vi.fn(),
        font: "10px sans-serif",
        textAlign: "start" as CanvasTextAlign,
        textBaseline: "alphabetic" as CanvasTextBaseline,
        fillStyle: "#000",
        strokeStyle: "#000",
        lineWidth: 1,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        imageSmoothingEnabled: true,
      };
    }
    return null;
  },
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ---------------------------------------------------------------------------
// Mock HTMLCanvasElement.toDataURL / toBlob
// ---------------------------------------------------------------------------

HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
);
HTMLCanvasElement.prototype.toBlob = vi.fn(
  (callback: BlobCallback) => callback(new Blob()),
);

// ---------------------------------------------------------------------------
// Mock Image loading behavior
// ---------------------------------------------------------------------------
// Instead of replacing document.createElement (which breaks React's <img>),
// we mock the src setter on HTMLImageElement so that setting `src` triggers
// the onload callback asynchronously — mimicking browser image loading.

Object.defineProperty(HTMLImageElement.prototype, "src", {
  get() {
    return this.getAttribute("src") ?? "";
  },
  set(value: string) {
    this.setAttribute("src", value);
    if (value) {
      // Set natural dimensions that jsdom doesn't provide
      Object.defineProperty(this, "naturalWidth", {
        value: 100,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(this, "naturalHeight", {
        value: 100,
        writable: true,
        configurable: true,
      });
      // Trigger onload asynchronously, like a real browser
      setTimeout(() => {
        if (typeof this.onload === "function") {
          this.onload(new Event("load"));
        }
        this.dispatchEvent(new Event("load"));
      }, 0);
    } else {
      // Clearing src — clean up handlers
      if (this.onload) this.onload = null;
    }
  },
  configurable: true,
  enumerable: true,
});

// ---------------------------------------------------------------------------
// Mock URL.createObjectURL / revokeObjectURL
// ---------------------------------------------------------------------------

global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// ---------------------------------------------------------------------------
// Mock pointer capture (not available in jsdom)
// ---------------------------------------------------------------------------

Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);

// ---------------------------------------------------------------------------
// Suppress specific console warnings that are expected during tests
// ---------------------------------------------------------------------------

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  // Suppress React act() warnings and D3 warnings
  if (msg.includes("inside a test was not wrapped in act")) return;
  if (msg.includes("victory-vendor")) return;
  originalWarn(...args);
};

// Also suppress expected error boundary logs from React during img error tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Consider adding an error boundary")) return;
  if (msg.includes("The above error occurred in the <img> component")) return;
  originalError(...args);
};
