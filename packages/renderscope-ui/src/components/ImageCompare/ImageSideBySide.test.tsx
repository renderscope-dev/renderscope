import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ImageSideBySide } from "./ImageSideBySide";
import {
  mockComparisonImages,
  mockSingleImage,
  mockLeftImage,
  mockRightImage,
} from "../../__tests__/fixtures";

describe("ImageSideBySide", () => {
  const twoImages = [mockLeftImage, mockRightImage];

  it("renders without crashing with two images", () => {
    const { container } = render(<ImageSideBySide images={twoImages} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows both image labels", () => {
    render(<ImageSideBySide images={twoImages} showLabels={true} />);
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
  });

  it("hides labels when showLabels is false", () => {
    render(<ImageSideBySide images={twoImages} showLabels={false} />);
    expect(screen.queryByText("PBRT v4")).not.toBeInTheDocument();
    expect(screen.queryByText("Mitsuba 3")).not.toBeInTheDocument();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} className="sbs-custom" />,
    );
    expect(container.firstChild).toHaveClass("sbs-custom");
  });

  it("handles single image gracefully", () => {
    const { container } = render(
      <ImageSideBySide images={mockSingleImage} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles multiple images (3+)", () => {
    const { container } = render(
      <ImageSideBySide images={mockComparisonImages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with horizontal layout", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} layout="horizontal" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with vertical layout", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} layout="vertical" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows zoom controls by default", () => {
    render(<ImageSideBySide images={twoImages} showZoomControls={true} />);
    // Should render zoom control buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("hides zoom controls when showZoomControls is false", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} showZoomControls={false} />,
    );
    // No zoom controls rendered
    const controlsContainer = container.querySelector(
      ".rs-sidebyside__controls",
    );
    expect(controlsContainer).toBeNull();
  });

  it("accepts syncZoom prop", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} syncZoom={true} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts initialZoom prop", () => {
    const { container } = render(
      <ImageSideBySide images={twoImages} initialZoom={2} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
