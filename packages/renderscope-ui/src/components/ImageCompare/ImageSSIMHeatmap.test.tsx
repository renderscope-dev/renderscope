import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ImageSSIMHeatmap } from "./ImageSSIMHeatmap";
import { TRANSPARENT_PNG, RED_PNG } from "../../__tests__/fixtures";

describe("ImageSSIMHeatmap", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <ImageSSIMHeatmap reference={TRANSPARENT_PNG} test={RED_PNG} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts colorMap='viridis' prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        colorMap="viridis"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts colorMap='inferno' prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        colorMap="inferno"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts colorMap='magma' prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        colorMap="magma"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts blockSize prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        blockSize={4}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles identical images", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={TRANSPARENT_PNG}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        className="heatmap-custom"
      />,
    );
    expect(container.firstChild).toHaveClass("heatmap-custom");
  });

  it("respects showScore prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        showScore={false}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("respects showColorbar prop", () => {
    const { container } = render(
      <ImageSSIMHeatmap
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        showColorbar={false}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
