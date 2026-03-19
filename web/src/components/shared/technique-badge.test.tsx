import { describe, it, expect } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { TechniqueBadge } from "./technique-badge";

describe("TechniqueBadge", () => {
  it("renders the correct label for known techniques", () => {
    render(<TechniqueBadge technique="path_tracing" />);
    expect(screen.getByText("Path Tracing")).toBeInTheDocument();
  });

  it("renders the technique key as-is for unknown techniques", () => {
    render(<TechniqueBadge technique="unknown_technique" />);
    expect(screen.getByText("unknown_technique")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<TechniqueBadge technique="ray_tracing" />);
    const badge = screen.getByText("Ray Tracing");
    expect(badge.tagName).toBe("SPAN");
  });

  it("applies correct CSS classes for small size (default)", () => {
    render(<TechniqueBadge technique="rasterization" />);
    const badge = screen.getByText("Rasterization");
    expect(badge.className).toContain("text-[11px]");
    expect(badge.className).toContain("rounded-full");
  });

  it("applies correct CSS classes for medium size", () => {
    render(<TechniqueBadge technique="neural" size="md" />);
    const badge = screen.getByText("Neural");
    expect(badge.className).toContain("text-xs");
  });

  it("applies correct CSS classes for large size", () => {
    render(<TechniqueBadge technique="neural" size="lg" />);
    const badge = screen.getByText("Neural");
    expect(badge.className).toContain("text-sm");
  });

  it("applies custom className", () => {
    render(
      <TechniqueBadge technique="path_tracing" className="custom-class" />,
    );
    const badge = screen.getByText("Path Tracing");
    expect(badge.className).toContain("custom-class");
  });

  it("sets inline HSL color styles", () => {
    render(<TechniqueBadge technique="path_tracing" />);
    const badge = screen.getByText("Path Tracing");
    expect(badge.style.color).toContain("hsl");
    expect(badge.style.backgroundColor).toContain("hsl");
    expect(badge.style.borderColor).toContain("hsl");
  });

  it("renders all known technique labels correctly", () => {
    const techniques = [
      { key: "path_tracing", label: "Path Tracing" },
      { key: "ray_tracing", label: "Ray Tracing" },
      { key: "rasterization", label: "Rasterization" },
      { key: "neural", label: "Neural" },
      { key: "gaussian_splatting", label: "Gaussian Splatting" },
      { key: "differentiable", label: "Differentiable" },
      { key: "volume_rendering", label: "Volume" },
      { key: "ray_marching", label: "Ray Marching" },
    ];

    for (const { key, label } of techniques) {
      const { unmount } = render(<TechniqueBadge technique={key} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
