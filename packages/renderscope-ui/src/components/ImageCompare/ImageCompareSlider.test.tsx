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
});
