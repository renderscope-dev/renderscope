import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ImageCompareSlider } from "./ImageCompareSlider";
import { mockLeftImage, mockRightImage } from "../../__tests__/fixtures";

/**
 * Wait for mocked image onload to fire (setTimeout(0) in src setter mock).
 */
async function waitForImageLoad(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe("ImageCompareSlider", () => {
  it("renders without crashing", async () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders a slider role element with ARIA attributes after images load", async () => {
    render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    await waitForImageLoad();

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuemin");
    expect(slider).toHaveAttribute("aria-valuemax");
    expect(slider).toHaveAttribute("aria-valuenow");
  });

  it("displays labels when showLabels is true after images load", async () => {
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        showLabels={true}
      />,
    );
    await waitForImageLoad();

    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
  });

  it("hides labels when showLabels is false", async () => {
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        showLabels={false}
      />,
    );
    await waitForImageLoad();

    expect(screen.queryByText("PBRT v4")).not.toBeInTheDocument();
    expect(screen.queryByText("Mitsuba 3")).not.toBeInTheDocument();
  });

  it("respects initialPosition prop", async () => {
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        initialPosition={0.3}
      />,
    );
    await waitForImageLoad();

    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuenow")).toBe("30");
  });

  it("fires onPositionChange callback on keyboard interaction", async () => {
    const onChange = vi.fn();
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        onPositionChange={onChange}
      />,
    );
    await waitForImageLoad();

    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalled();
  });

  it("supports horizontal orientation", async () => {
    const { container } = render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        orientation="horizontal"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("supports vertical orientation", async () => {
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        orientation="vertical"
      />,
    );
    await waitForImageLoad();

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
  });

  it("handles missing optional props gracefully", () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts and applies className prop", () => {
    const { container } = render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        className="custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows metadata overlay when showMetadata is true after images load", async () => {
    render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        showMetadata={true}
      />,
    );
    await waitForImageLoad();

    // The metadata should include keys from the fixture (both left/right)
    const rendererLabels = screen.getAllByText("renderer");
    expect(rendererLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders two images", () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(2);
  });

  it("shows skeleton while images load", () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    const skeleton = container.querySelector(".rs-skeleton");
    expect(skeleton).not.toBeNull();
  });

  it("hides skeleton after images load", async () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    await waitForImageLoad();

    const skeleton = container.querySelector(".rs-skeleton");
    expect(skeleton).toBeNull();
  });

  // ── Pointer dragging ──────────────────────────────────────────────────────
  //
  // jsdom reports every element as 0x0, so `getBoundingClientRect` is stubbed
  // to give the container a real width; the hook divides by `rect.width`, which
  // is NaN otherwise.

  /** Give the slider container a measurable box and return it. */
  function measuredContainer(container: HTMLElement): HTMLElement {
    const root = container.firstElementChild as HTMLElement;
    root.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0 }) as DOMRect;
    return root;
  }

  it("moves the divider when a pointer is dragged across it", async () => {
    const onPositionChange = vi.fn();
    const { container } = render(
      <ImageCompareSlider
        left={mockLeftImage}
        right={mockRightImage}
        onPositionChange={onPositionChange}
      />,
    );
    await waitForImageLoad();
    const root = measuredContainer(container);

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 100, clientY: 100 });

    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "25");
    expect(onPositionChange).toHaveBeenLastCalledWith(0.25);
  });

  it("stops dragging when the browser cancels the gesture", async () => {
    // A touch the compositor reclassifies as a scroll fires `pointercancel`
    // and never a `pointerup`. Without handling it the slider stayed latched in
    // its dragging state, and the next bare `pointermove` kept moving the
    // divider with nothing pressed.
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    await waitForImageLoad();
    const root = measuredContainer(container);

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "25");

    fireEvent.pointerCancel(root, { pointerId: 1, clientX: 100, clientY: 100 });

    // Moving afterwards must not drag: the gesture is over.
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 360, clientY: 100 });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "25");
  });

  it("clamps the divider to the container edges", async () => {
    const { container } = render(
      <ImageCompareSlider left={mockLeftImage} right={mockRightImage} />,
    );
    await waitForImageLoad();
    const root = measuredContainer(container);

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(root, { pointerId: 1, clientX: -500, clientY: 100 });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");

    fireEvent.pointerMove(root, { pointerId: 1, clientX: 9000, clientY: 100 });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "100");
  });
});
