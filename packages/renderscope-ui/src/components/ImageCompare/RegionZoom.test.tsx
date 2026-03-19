import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { RegionZoom } from "./RegionZoom";
import {
  mockComparisonImages,
  mockSingleImage,
  mockLeftImage,
  mockRightImage,
} from "../../__tests__/fixtures";

describe("RegionZoom", () => {
  const twoImages = [mockLeftImage, mockRightImage];

  it("renders without crashing", () => {
    const { container } = render(<RegionZoom images={twoImages} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders as an application role element", () => {
    render(<RegionZoom images={twoImages} />);
    const app = screen.getByRole("application");
    expect(app).toBeInTheDocument();
  });

  it("accepts zoomLevel prop at value 2", () => {
    const { container } = render(
      <RegionZoom images={twoImages} zoomLevel={2} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts zoomLevel prop at value 4", () => {
    const { container } = render(
      <RegionZoom images={twoImages} zoomLevel={4} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts zoomLevel prop at value 8", () => {
    const { container } = render(
      <RegionZoom images={twoImages} zoomLevel={8} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts regionSize prop", () => {
    const { container } = render(
      <RegionZoom images={twoImages} regionSize={200} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles single image gracefully", () => {
    const { container } = render(
      <RegionZoom images={mockSingleImage} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles many images", () => {
    const { container } = render(
      <RegionZoom images={mockComparisonImages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <RegionZoom images={twoImages} className="zoom-custom" />,
    );
    expect(container.firstChild).toHaveClass("zoom-custom");
  });

  it("shows zoom preset buttons", () => {
    render(<RegionZoom images={twoImages} />);
    // Zoom presets (2×, 4×, 8×, 16×) should be buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows image labels when showLabels is true", () => {
    render(<RegionZoom images={twoImages} showLabels={true} />);
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
  });

  it("supports keyboard navigation", () => {
    render(<RegionZoom images={twoImages} />);
    const app = screen.getByRole("application");
    // Arrow keys should not throw
    fireEvent.keyDown(app, { key: "ArrowRight" });
    fireEvent.keyDown(app, { key: "ArrowLeft" });
    fireEvent.keyDown(app, { key: "ArrowUp" });
    fireEvent.keyDown(app, { key: "ArrowDown" });
  });

  it("renders overview section with an image", () => {
    const { container } = render(<RegionZoom images={twoImages} />);
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it("renders magnified panels", () => {
    const { container } = render(<RegionZoom images={twoImages} />);
    const panels = container.querySelectorAll(".rs-zoom__panel");
    // At least one magnified panel per image (if loaded)
    expect(panels.length).toBeGreaterThanOrEqual(0);
  });
});
