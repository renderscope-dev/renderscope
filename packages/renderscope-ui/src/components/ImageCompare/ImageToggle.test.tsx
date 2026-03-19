import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ImageToggle } from "./ImageToggle";
import {
  mockComparisonImages,
  mockManyImages,
  mockSingleImage,
} from "../../__tests__/fixtures";

/**
 * Wait for mocked image onload to fire (setTimeout(0) in src setter mock).
 */
async function waitForImageLoad(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe("ImageToggle", () => {
  it("renders without crashing with multiple images", () => {
    const { container } = render(
      <ImageToggle images={mockComparisonImages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the first image label after images load", async () => {
    render(<ImageToggle images={mockComparisonImages} showLabel={true} />);
    await waitForImageLoad();
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
  });

  it("toggles to next image on next button click", async () => {
    render(<ImageToggle images={mockComparisonImages} showLabel={true} />);
    await waitForImageLoad();

    const nextBtn = screen.getByLabelText("Next image");
    fireEvent.click(nextBtn);
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
  });

  it("shows label when showLabel is true after images load", async () => {
    render(<ImageToggle images={mockComparisonImages} showLabel={true} />);
    await waitForImageLoad();
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", async () => {
    render(<ImageToggle images={mockComparisonImages} showLabel={false} />);
    await waitForImageLoad();

    // Label badge should not exist
    expect(screen.queryByText("PBRT v4")).not.toBeInTheDocument();
  });

  it("handles single image without error", () => {
    const { container } = render(
      <ImageToggle images={mockSingleImage} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles many images", () => {
    const { container } = render(
      <ImageToggle images={mockManyImages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <ImageToggle images={mockComparisonImages} className="toggle-custom" />,
    );
    expect(container.firstChild).toHaveClass("toggle-custom");
  });

  it("renders toolbar with controls after images load", async () => {
    render(<ImageToggle images={mockComparisonImages} />);
    await waitForImageLoad();

    // Should have prev, play/pause, speed buttons, next
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders dot indicators when showIndicators is true", async () => {
    render(
      <ImageToggle images={mockComparisonImages} showIndicators={true} />,
    );
    await waitForImageLoad();

    // There should be dot buttons with "View image" labels
    const dotButtons = screen.getAllByLabelText(/view image/i);
    expect(dotButtons.length).toBe(mockComparisonImages.length);
  });

  it("fires onImageChange callback", async () => {
    const onChange = vi.fn();
    render(
      <ImageToggle
        images={mockComparisonImages}
        onImageChange={onChange}
      />,
    );
    await waitForImageLoad();

    const nextBtn = screen.getByLabelText("Next image");
    fireEvent.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  describe("auto-play with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not auto-toggle when interval is 0 and play is not pressed", async () => {
      render(
        <ImageToggle
          images={mockComparisonImages}
          interval={0}
          showLabel={true}
        />,
      );

      // Advance timers to trigger image loads (our src setter mock)
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Advance more to check auto-toggle doesn't happen
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Counter should still show "1 / 3"
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });
  });

  it("supports keyboard navigation (ArrowRight)", async () => {
    render(<ImageToggle images={mockComparisonImages} showLabel={true} />);
    await waitForImageLoad();

    const container = screen.getByRole("group");
    fireEvent.keyDown(container, { key: "ArrowRight" });
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
  });

  it("renders image elements", () => {
    const { container } = render(
      <ImageToggle images={mockComparisonImages} />,
    );
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(mockComparisonImages.length);
  });

  it("shows skeleton before images load", () => {
    const { container } = render(
      <ImageToggle images={mockComparisonImages} />,
    );
    const skeleton = container.querySelector(".rs-skeleton");
    expect(skeleton).not.toBeNull();
  });

  it("has group role container", () => {
    render(<ImageToggle images={mockComparisonImages} />);
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
  });
});
