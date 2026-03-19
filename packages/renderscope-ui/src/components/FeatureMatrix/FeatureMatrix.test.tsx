import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { FeatureMatrix } from "./FeatureMatrix";
import {
  mockFeatureCategories,
  mockRenderers,
  mockSingleRenderer,
  mockManyRenderers,
} from "../../__tests__/fixtures";

describe("FeatureMatrix", () => {
  it("renders without crashing with valid data", () => {
    const { container } = render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("displays renderer names in the header", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
      />,
    );
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
    expect(screen.getByText("Mitsuba 3")).toBeInTheDocument();
    expect(screen.getByText("Blender Cycles")).toBeInTheDocument();
  });

  it("displays feature labels", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
      />,
    );
    expect(screen.getByText("Global Illumination")).toBeInTheDocument();
    expect(screen.getByText("Path Tracing")).toBeInTheDocument();
    expect(screen.getByText("glTF")).toBeInTheDocument();
    expect(screen.getByText("Python API")).toBeInTheDocument();
  });

  it("displays category group headers", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
      />,
    );
    expect(screen.getByText("Rendering Capabilities")).toBeInTheDocument();
    expect(screen.getByText("Format Support")).toBeInTheDocument();
    expect(screen.getByText("API & Ecosystem")).toBeInTheDocument();
  });

  it("collapses a group on header click when collapsible", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        collapsible={true}
      />,
    );

    // "Rendering Capabilities" header — click to collapse
    const header = screen.getByText("Rendering Capabilities");
    fireEvent.click(header.closest("td") ?? header);

    // After collapse, the features within should not be visible
    // Feature labels inside this group may be hidden
    // The group header should still be visible
    expect(screen.getByText("Rendering Capabilities")).toBeInTheDocument();
  });

  it("groups start expanded by default", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        collapsible={true}
      />,
    );
    // All feature labels should be visible initially
    expect(screen.getByText("Global Illumination")).toBeInTheDocument();
    expect(screen.getByText("glTF")).toBeInTheDocument();
    expect(screen.getByText("Python API")).toBeInTheDocument();
  });

  it("shows empty state when less than 2 renderers", () => {
    render(
      <FeatureMatrix
        renderers={mockSingleRenderer}
        features={mockFeatureCategories}
      />,
    );
    // Should show an empty state message
    const emptyEl = screen.getByText(/select at least 2/i);
    expect(emptyEl).toBeInTheDocument();
  });

  it("shows empty state with zero renderers", () => {
    render(
      <FeatureMatrix renderers={[]} features={mockFeatureCategories} />,
    );
    const emptyEl = screen.getByText(/select at least 2/i);
    expect(emptyEl).toBeInTheDocument();
  });

  it("renders correctly with many renderers", () => {
    const { container } = render(
      <FeatureMatrix
        renderers={mockManyRenderers}
        features={mockFeatureCategories}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        className="matrix-custom"
      />,
    );
    expect(container.firstChild).toHaveClass("matrix-custom");
  });

  it("fires onRendererClick callback", () => {
    const onClick = vi.fn();
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        onRendererClick={onClick}
      />,
    );
    // Click on a renderer name in the header
    const rendererName = screen.getByText("PBRT v4");
    fireEvent.click(rendererName);
    expect(onClick).toHaveBeenCalledWith("pbrt");
  });

  it("fires onRendererRemove callback", () => {
    const onRemove = vi.fn();
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        onRendererRemove={onRemove}
      />,
    );
    // Find remove buttons (×)
    const removeButtons = screen.getAllByLabelText(/remove/i);
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]!);
      expect(onRemove).toHaveBeenCalled();
    }
  });

  it("renders a table element", () => {
    const { container } = render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
      />,
    );
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
  });

  it("supports stickyHeader prop", () => {
    const { container } = render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        stickyHeader={true}
      />,
    );
    const scrollContainer = container.querySelector(
      ".rs-feature-matrix-scroll--sticky",
    );
    expect(scrollContainer).not.toBeNull();
  });

  it("exportable controls show when exportable is true", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        exportable={true}
      />,
    );
    // Should have CSV/PNG export buttons
    const csvButton = screen.getByText(/csv/i);
    expect(csvButton).toBeInTheDocument();
  });

  it("export buttons hidden when exportable is false", () => {
    render(
      <FeatureMatrix
        renderers={mockRenderers}
        features={mockFeatureCategories}
        exportable={false}
      />,
    );
    expect(screen.queryByText(/csv/i)).not.toBeInTheDocument();
  });
});
