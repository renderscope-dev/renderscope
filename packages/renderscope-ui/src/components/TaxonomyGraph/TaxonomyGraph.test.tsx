import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { TaxonomyGraph } from "./TaxonomyGraph";
import {
  mockTaxonomyData,
  emptyTaxonomyData,
  singleNodeTaxonomy,
} from "../../__tests__/fixtures";
import {
  createMockForceSimulation,
  createMockForceLink,
  createMockForceManyBody,
  createMockForceCenter,
  createMockForceCollide,
} from "../../__tests__/mocks/d3-force";

// Mock D3 force module to avoid real physics simulation in jsdom
vi.mock("d3-force", () => ({
  forceSimulation: () => createMockForceSimulation(),
  forceLink: () => createMockForceLink(),
  forceManyBody: () => createMockForceManyBody(),
  forceCenter: () => createMockForceCenter(),
  forceCollide: () => createMockForceCollide(),
}));

// Mock D3 selection to provide basic SVG operations
vi.mock("d3-selection", () => {
  const mockSelection = {
    append: vi.fn(() => mockSelection),
    attr: vi.fn(() => mockSelection),
    style: vi.fn(() => mockSelection),
    text: vi.fn(() => mockSelection),
    call: vi.fn(() => mockSelection),
    on: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
    select: vi.fn(() => mockSelection),
    data: vi.fn(() => mockSelection),
    enter: vi.fn(() => mockSelection),
    exit: vi.fn(() => mockSelection),
    remove: vi.fn(() => mockSelection),
    join: vi.fn(() => mockSelection),
    merge: vi.fn(() => mockSelection),
    filter: vi.fn(() => mockSelection),
    each: vi.fn(() => mockSelection),
    transition: vi.fn(() => mockSelection),
    duration: vi.fn(() => mockSelection),
    ease: vi.fn(() => mockSelection),
    node: vi.fn(() => null),
    empty: vi.fn(() => true),
    datum: vi.fn(() => mockSelection),
    classed: vi.fn(() => mockSelection),
    property: vi.fn(() => mockSelection),
    raise: vi.fn(() => mockSelection),
    lower: vi.fn(() => mockSelection),
  };
  return {
    select: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
  };
});

// Mock D3 zoom
vi.mock("d3-zoom", () => {
  const mockZoom = vi.fn(() => mockZoom);
  Object.assign(mockZoom, {
    scaleExtent: vi.fn(() => mockZoom),
    on: vi.fn(() => mockZoom),
    filter: vi.fn(() => mockZoom),
    transform: vi.fn(() => mockZoom),
    translateTo: vi.fn(() => mockZoom),
    scaleTo: vi.fn(() => mockZoom),
  });
  return {
    zoom: vi.fn(() => mockZoom),
    zoomIdentity: { x: 0, y: 0, k: 1 },
  };
});

// Mock D3 drag
vi.mock("d3-drag", () => {
  const mockDrag = vi.fn(() => mockDrag);
  Object.assign(mockDrag, {
    on: vi.fn(() => mockDrag),
    filter: vi.fn(() => mockDrag),
    subject: vi.fn(() => mockDrag),
  });
  return {
    drag: vi.fn(() => mockDrag),
  };
});

// Mock D3 color
vi.mock("d3-color", () => ({
  color: vi.fn((c: string) => ({
    brighter: vi.fn(() => ({ formatHex: () => "#ffffff" })),
    darker: vi.fn(() => ({ formatHex: () => "#000000" })),
    formatHex: () => c || "#000000",
    opacity: 1,
    toString: () => c || "#000000",
  })),
}));

// Mock D3 transition side-effect import
vi.mock("d3-transition", () => ({}));

describe("TaxonomyGraph", () => {
  it("renders without crashing with valid data", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TaxonomyGraph data={mockTaxonomyData} />);
      container = result.container;
    });
    expect(container!.firstChild).toBeTruthy();
  });

  it("renders empty state for empty data", () => {
    render(<TaxonomyGraph data={emptyTaxonomyData} />);
    expect(screen.getByText("No data to display.")).toBeInTheDocument();
  });

  it("renders SSR placeholder initially then mounts", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TaxonomyGraph data={mockTaxonomyData} />);
      container = result.container;
    });
    // After act, the component should have mounted (isMounted = true)
    expect(container!.querySelector(".rs-taxonomy-container")).not.toBeNull();
  });

  it("single node renders without crashing", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TaxonomyGraph data={singleNodeTaxonomy} />);
      container = result.container;
    });
    expect(container!.firstChild).toBeTruthy();
  });

  it("applies className prop", () => {
    render(
      <TaxonomyGraph data={emptyTaxonomyData} className="graph-custom" />,
    );
    const el = screen.getByText("No data to display.");
    expect(el).toHaveClass("graph-custom");
  });

  it("applies minHeight prop", () => {
    render(
      <TaxonomyGraph data={emptyTaxonomyData} minHeight={400} />,
    );
    const el = screen.getByText("No data to display.");
    expect(el).toHaveStyle({ minHeight: "400px" });
  });

  it("accepts colorBy='technique' prop", async () => {
    await act(async () => {
      render(<TaxonomyGraph data={mockTaxonomyData} colorBy="technique" />);
    });
    // Should render without error
  });

  it("accepts colorBy='language' prop", async () => {
    await act(async () => {
      render(<TaxonomyGraph data={mockTaxonomyData} colorBy="language" />);
    });
    // Should render without error
  });

  it("accepts highlightedNodes prop", async () => {
    await act(async () => {
      render(
        <TaxonomyGraph
          data={mockTaxonomyData}
          highlightedNodes={["pbrt", "mitsuba3"]}
        />,
      );
    });
    // Should render without error
  });

  it("accepts onNodeClick callback", async () => {
    const onClick = vi.fn();
    await act(async () => {
      render(
        <TaxonomyGraph data={mockTaxonomyData} onNodeClick={onClick} />,
      );
    });
    // The callback is wired to ForceGraph — verifying it's accepted without error
  });

  it("hides legend when showLegend is false", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <TaxonomyGraph data={mockTaxonomyData} showLegend={false} />,
      );
      container = result.container;
    });
    // Legend should not be in the DOM
    const legend = container!.querySelector(".rs-taxonomy-legend");
    expect(legend).toBeNull();
  });

  it("hides controls when showControls is false", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <TaxonomyGraph data={mockTaxonomyData} showControls={false} />,
      );
      container = result.container;
    });
    // Controls should not be in the DOM
    const controls = container!.querySelector(".rs-taxonomy-controls");
    expect(controls).toBeNull();
  });

  it("hides controls when interactive is false", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <TaxonomyGraph data={mockTaxonomyData} interactive={false} />,
      );
      container = result.container;
    });
    // Controls should not be in DOM (showControls && interactive must both be true)
    const controls = container!.querySelector(".rs-taxonomy-controls");
    expect(controls).toBeNull();
  });

  it("renders SVG element for the graph", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TaxonomyGraph data={mockTaxonomyData} />);
      container = result.container;
    });
    const svg = container!.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("accepts custom colorMap prop", async () => {
    await act(async () => {
      render(
        <TaxonomyGraph
          data={mockTaxonomyData}
          colorMap={{ path_tracing: "#ff0000", rasterization: "#00ff00" }}
        />,
      );
    });
    // Should render without error
  });
});
