import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ViewToggle } from "./view-toggle";

describe("ViewToggle", () => {
  it("renders all three view options", () => {
    render(<ViewToggle view="grid" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
    expect(screen.getByLabelText("Graph view")).toBeInTheDocument();
  });

  it("marks the active view as pressed", () => {
    render(<ViewToggle view="list" onChange={vi.fn()} />);

    const listButton = screen.getByLabelText("List view");
    expect(listButton).toHaveAttribute("data-state", "on");

    const gridButton = screen.getByLabelText("Grid view");
    expect(gridButton).toHaveAttribute("data-state", "off");
  });

  it("calls onChange when a view option is clicked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="grid" onChange={onChange} />);

    const listButton = screen.getByLabelText("List view");
    listButton.click();

    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("calls onChange with 'graph' when graph is clicked", () => {
    const onChange = vi.fn();
    render(<ViewToggle view="grid" onChange={onChange} />);

    screen.getByLabelText("Graph view").click();
    expect(onChange).toHaveBeenCalledWith("graph");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ViewToggle view="grid" onChange={vi.fn()} className="custom-class" />,
    );
    const toggleGroup = container.querySelector("[role='group']");
    expect(toggleGroup?.className).toContain("custom-class");
  });
});
