import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { FeatureCell } from "./FeatureCell";

// FeatureCell renders a <td>, so wrap in table structure
function renderCell(value: boolean | null | undefined, isDifferent?: boolean) {
  return render(
    <table>
      <tbody>
        <tr>
          <FeatureCell value={value} isDifferent={isDifferent} />
        </tr>
      </tbody>
    </table>,
  );
}

describe("FeatureCell", () => {
  it("renders supported icon for true value", () => {
    const { container } = renderCell(true);
    const cell = container.querySelector("td");
    expect(cell).not.toBeNull();
    expect(cell).toHaveClass("rs-feature-cell--supported");
    expect(cell).toHaveAttribute("title", "Supported");
  });

  it("renders unsupported icon for false value", () => {
    const { container } = renderCell(false);
    const cell = container.querySelector("td");
    expect(cell).not.toBeNull();
    expect(cell).toHaveClass("rs-feature-cell--unsupported");
    expect(cell).toHaveAttribute("title", "Not supported");
  });

  it("renders N/A icon for null value", () => {
    const { container } = renderCell(null);
    const cell = container.querySelector("td");
    expect(cell).not.toBeNull();
    expect(cell).toHaveClass("rs-feature-cell--na");
    expect(cell).toHaveAttribute("title", "Not applicable");
  });

  it("renders N/A icon for undefined value", () => {
    const { container } = renderCell(undefined);
    const cell = container.querySelector("td");
    expect(cell).not.toBeNull();
    expect(cell).toHaveClass("rs-feature-cell--na");
  });

  it("always renders a <td> element", () => {
    const { container: c1 } = renderCell(true);
    const { container: c2 } = renderCell(false);
    const { container: c3 } = renderCell(null);
    expect(c1.querySelector("td")).not.toBeNull();
    expect(c2.querySelector("td")).not.toBeNull();
    expect(c3.querySelector("td")).not.toBeNull();
  });

  it("has the rs-feature-cell base class for all values", () => {
    const { container: c1 } = renderCell(true);
    const { container: c2 } = renderCell(false);
    const { container: c3 } = renderCell(null);
    expect(c1.querySelector(".rs-feature-cell")).not.toBeNull();
    expect(c2.querySelector(".rs-feature-cell")).not.toBeNull();
    expect(c3.querySelector(".rs-feature-cell")).not.toBeNull();
  });
});
