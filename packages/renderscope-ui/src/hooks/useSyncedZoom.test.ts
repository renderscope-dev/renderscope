import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncedZoom } from "./useSyncedZoom";

describe("useSyncedZoom", () => {
  it("returns initial state with scale 1 and zero offsets", () => {
    const { result } = renderHook(() => useSyncedZoom());
    expect(result.current.state).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("returns handler functions", () => {
    const { result } = renderHook(() => useSyncedZoom());
    expect(typeof result.current.handlers.onWheel).toBe("function");
    expect(typeof result.current.handlers.onPointerDown).toBe("function");
    expect(typeof result.current.handlers.onPointerMove).toBe("function");
    expect(typeof result.current.handlers.onPointerUp).toBe("function");
    expect(typeof result.current.handlers.onDoubleClick).toBe("function");
    expect(typeof result.current.reset).toBe("function");
    expect(typeof result.current.setZoom).toBe("function");
  });

  it("setZoom updates scale", () => {
    const { result } = renderHook(() => useSyncedZoom());

    act(() => {
      result.current.setZoom(4);
    });

    expect(result.current.state.scale).toBe(4);
  });

  it("setZoom clamps to minimum scale of 1", () => {
    const { result } = renderHook(() => useSyncedZoom());

    act(() => {
      result.current.setZoom(0.5);
    });

    // When scale <= 1, resets to initial state
    expect(result.current.state.scale).toBe(1);
    expect(result.current.state.offsetX).toBe(0);
    expect(result.current.state.offsetY).toBe(0);
  });

  it("setZoom clamps to maximum scale of 32", () => {
    const { result } = renderHook(() => useSyncedZoom());

    act(() => {
      result.current.setZoom(100);
    });

    expect(result.current.state.scale).toBe(32);
  });

  it("reset restores initial state", () => {
    const { result } = renderHook(() => useSyncedZoom());

    // Zoom in first
    act(() => {
      result.current.setZoom(8);
    });
    expect(result.current.state.scale).toBe(8);

    // Reset
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("double click resets to initial state", () => {
    const { result } = renderHook(() => useSyncedZoom());

    // Zoom in
    act(() => {
      result.current.setZoom(4);
    });
    expect(result.current.state.scale).toBe(4);

    // Double click
    act(() => {
      result.current.handlers.onDoubleClick();
    });
    expect(result.current.state).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("onWheel zooms in on scroll up (negative deltaY)", () => {
    const { result } = renderHook(() => useSyncedZoom());

    const mockElement = document.createElement("div");
    mockElement.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    act(() => {
      result.current.handlers.onWheel({
        deltaY: -100,
        clientX: 100,
        clientY: 100,
        currentTarget: mockElement,
        preventDefault: () => {},
      } as unknown as React.WheelEvent);
    });

    expect(result.current.state.scale).toBeGreaterThan(1);
  });

  it("onWheel zooms out on scroll down (positive deltaY)", () => {
    const { result } = renderHook(() => useSyncedZoom());

    // First zoom in
    act(() => {
      result.current.setZoom(4);
    });

    const mockElement = document.createElement("div");
    mockElement.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    act(() => {
      result.current.handlers.onWheel({
        deltaY: 100,
        clientX: 100,
        clientY: 100,
        currentTarget: mockElement,
        preventDefault: () => {},
      } as unknown as React.WheelEvent);
    });

    expect(result.current.state.scale).toBeLessThan(4);
  });

  it("panning does not change offset when scale is 1", () => {
    const { result } = renderHook(() => useSyncedZoom());

    const mockElement = document.createElement("div");

    // Pointer down
    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        currentTarget: mockElement,
        preventDefault: () => {},
      } as unknown as React.PointerEvent);
    });

    // Pointer move
    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 150,
        clientY: 150,
      } as unknown as React.PointerEvent);
    });

    // At scale 1, panning should not change offset
    expect(result.current.state.offsetX).toBe(0);
    expect(result.current.state.offsetY).toBe(0);
  });

  it("panning updates offset when zoomed in", () => {
    const { result } = renderHook(() => useSyncedZoom());

    // Zoom in first
    act(() => {
      result.current.setZoom(4);
    });

    const mockElement = document.createElement("div");

    // Pointer down
    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        currentTarget: mockElement,
        preventDefault: () => {},
      } as unknown as React.PointerEvent);
    });

    // Pointer move
    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 150,
        clientY: 130,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.state.offsetX).toBe(50);
    expect(result.current.state.offsetY).toBe(30);
  });
});
