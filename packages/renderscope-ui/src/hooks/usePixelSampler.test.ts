import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { usePixelSampler } from "./usePixelSampler";

function createMockCanvasRef(
  width = 100,
  height = 100,
): React.RefObject<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Mock getBoundingClientRect for coordinate mapping
  canvas.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  }));
  return { current: canvas } as React.RefObject<HTMLCanvasElement>;
}

function createMouseEvent(
  clientX: number,
  clientY: number,
): React.MouseEvent<HTMLCanvasElement> {
  return { clientX, clientY } as React.MouseEvent<HTMLCanvasElement>;
}

describe("usePixelSampler", () => {
  it("returns null pixel and position initially", () => {
    const canvasRef = createMockCanvasRef();
    const { result } = renderHook(() => usePixelSampler(canvasRef));
    expect(result.current.pixel).toBeNull();
    expect(result.current.position).toBeNull();
  });

  it("returns pixel data on mouse move", () => {
    const canvasRef = createMockCanvasRef();
    const { result } = renderHook(() => usePixelSampler(canvasRef));

    act(() => {
      result.current.onMouseMove(createMouseEvent(10, 20));
    });

    expect(result.current.position).toEqual({ x: 10, y: 20 });
    expect(result.current.pixel).not.toBeNull();
    expect(result.current.pixel).toEqual(
      expect.objectContaining({
        r: expect.any(Number),
        g: expect.any(Number),
        b: expect.any(Number),
        a: expect.any(Number),
      }),
    );
  });

  it("clears pixel data on mouse leave", () => {
    const canvasRef = createMockCanvasRef();
    const { result } = renderHook(() => usePixelSampler(canvasRef));

    act(() => {
      result.current.onMouseMove(createMouseEvent(10, 20));
    });
    expect(result.current.pixel).not.toBeNull();

    act(() => {
      result.current.onMouseLeave();
    });
    expect(result.current.pixel).toBeNull();
    expect(result.current.position).toBeNull();
  });

  it("does not sample when disabled", () => {
    const canvasRef = createMockCanvasRef();
    const { result } = renderHook(() => usePixelSampler(canvasRef, false));

    act(() => {
      result.current.onMouseMove(createMouseEvent(10, 20));
    });

    expect(result.current.pixel).toBeNull();
    expect(result.current.position).toBeNull();
  });

  it("handles out-of-bounds coordinates", () => {
    const canvasRef = createMockCanvasRef(100, 100);
    const { result } = renderHook(() => usePixelSampler(canvasRef));

    // Move to out-of-bounds position (negative)
    act(() => {
      result.current.onMouseMove(createMouseEvent(-10, -10));
    });
    expect(result.current.pixel).toBeNull();
    expect(result.current.position).toBeNull();
  });

  it("handles null canvas ref", () => {
    const canvasRef = {
      current: null,
    } as React.RefObject<HTMLCanvasElement>;
    const { result } = renderHook(() => usePixelSampler(canvasRef));

    act(() => {
      result.current.onMouseMove(createMouseEvent(10, 20));
    });
    expect(result.current.pixel).toBeNull();
  });

  it("returns handler functions", () => {
    const canvasRef = createMockCanvasRef();
    const { result } = renderHook(() => usePixelSampler(canvasRef));
    expect(typeof result.current.onMouseMove).toBe("function");
    expect(typeof result.current.onMouseLeave).toBe("function");
  });
});
