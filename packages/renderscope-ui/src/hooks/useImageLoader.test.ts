import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImageLoader } from "./useImageLoader";

/**
 * Helper to flush pending setTimeout(0) callbacks used by our
 * HTMLImageElement src setter mock.
 */
function flushTimers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

describe("useImageLoader", () => {
  it("returns initial idle state when src is undefined", () => {
    const { result } = renderHook(() => useImageLoader(undefined));
    expect(result.current.image).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });

  it("sets loading state when src is provided", () => {
    const { result } = renderHook(() =>
      useImageLoader("https://example.com/image.png"),
    );
    // Synchronously, loading should be true
    expect(result.current.loading).toBe(true);
    expect(result.current.image).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("resolves to loaded state after image onload fires", async () => {
    const { result } = renderHook(() =>
      useImageLoader("https://example.com/image.png"),
    );

    // Wait for the mocked setTimeout(0) in our src setter to trigger onload
    await act(async () => {
      await flushTimers();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.image).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.width).toBe(100); // Mock naturalWidth
    expect(result.current.height).toBe(100);
  });

  it("resets to idle state when src changes to undefined", async () => {
    const { result, rerender } = renderHook(
      ({ src }: { src: string | undefined }) => useImageLoader(src),
      { initialProps: { src: "https://example.com/image.png" } },
    );

    // Let image load
    await act(async () => {
      await flushTimers();
    });
    expect(result.current.loading).toBe(false);

    // Change src to undefined
    rerender({ src: undefined });
    expect(result.current.image).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });

  it("restarts loading when src changes to new URL", async () => {
    const { result, rerender } = renderHook(
      ({ src }: { src: string | undefined }) => useImageLoader(src),
      { initialProps: { src: "https://example.com/a.png" } },
    );

    // Let first image load
    await act(async () => {
      await flushTimers();
    });
    expect(result.current.loading).toBe(false);

    // Change src
    rerender({ src: "https://example.com/b.png" });
    expect(result.current.loading).toBe(true);

    // Let second image load
    await act(async () => {
      await flushTimers();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.image).not.toBeNull();
  });

  it("handles empty string src as falsy (idle state)", () => {
    const { result } = renderHook(() => useImageLoader(""));
    expect(result.current.loading).toBe(false);
    expect(result.current.image).toBeNull();
  });
});
