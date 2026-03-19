import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { FeatureGroupHeader } from "./FeatureGroupHeader";
import { mockFeatureCategories } from "../../__tests__/fixtures";

const renderingCategory = mockFeatureCategories[0]!;

// FeatureGroupHeader renders a <tr>, so wrap in table structure
function renderHeader(
  props: Partial<React.ComponentProps<typeof FeatureGroupHeader>> = {},
) {
  const defaultProps = {
    category: renderingCategory,
    isCollapsed: false,
    onToggle: vi.fn(),
    columnCount: 3,
    collapsible: true,
    ...props,
  };
  return render(
    <table>
      <tbody>
        <FeatureGroupHeader {...defaultProps} />
      </tbody>
    </table>,
  );
}

describe("FeatureGroupHeader", () => {
  it("renders the group label", () => {
    renderHeader();
    expect(screen.getByText("Rendering Capabilities")).toBeInTheDocument();
  });

  it("shows feature count", () => {
    renderHeader();
    // Should show count of features (e.g., "4 features" or "(4)")
    const text = screen.getByText(/4/);
    expect(text).toBeInTheDocument();
  });

  it("fires onToggle callback when clicked", () => {
    const onToggle = vi.fn();
    renderHeader({ onToggle });

    const cell = screen.getByRole("button");
    fireEvent.click(cell);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("has aria-expanded when collapsible", () => {
    renderHeader({ isCollapsed: false, collapsible: true });
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("has aria-expanded=false when collapsed", () => {
    renderHeader({ isCollapsed: true, collapsible: true });
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("responds to Enter key", () => {
    const onToggle = vi.fn();
    renderHeader({ onToggle, collapsible: true });
    const btn = screen.getByRole("button");
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(onToggle).toHaveBeenCalled();
  });

  it("responds to Space key", () => {
    const onToggle = vi.fn();
    renderHeader({ onToggle, collapsible: true });
    const btn = screen.getByRole("button");
    fireEvent.keyDown(btn, { key: " " });
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders a <tr> element", () => {
    const { container } = renderHeader();
    const row = container.querySelector("tr");
    expect(row).not.toBeNull();
  });

  it("cell spans full width (colSpan)", () => {
    const { container } = renderHeader({ columnCount: 5 });
    const cell = container.querySelector("td");
    expect(cell).not.toBeNull();
    // colSpan should be 1 + columnCount = 6
    expect(cell?.getAttribute("colspan")).toBe("6");
  });

  it("has collapsed modifier class when collapsed", () => {
    const { container } = renderHeader({ isCollapsed: true });
    const row = container.querySelector(".rs-feature-group-header--collapsed");
    expect(row).not.toBeNull();
  });

  it("renders chevron icon", () => {
    const { container } = renderHeader({ collapsible: true });
    const chevron = container.querySelector(".rs-feature-group-chevron");
    expect(chevron).not.toBeNull();
  });
});
