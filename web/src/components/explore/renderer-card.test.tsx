import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { RendererCard } from "./renderer-card";
import type { RendererCardData } from "@/types/renderer";

// Mock next/link to render as a plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockRenderer: RendererCardData = {
  id: "pbrt",
  name: "PBRT v4",
  description: "Physically Based Rendering Toolkit — the reference path tracer",
  technique: ["path_tracing"],
  language: "C++",
  license: "BSD-2-Clause",
  github_stars: 5200,
  status: "active",
  thumbnail: undefined,
  gpu_support: true,
  cpu_support: true,
  platforms: ["linux", "macos", "windows"],
  tags: ["research", "reference"],
  best_for: "Academic research and reference implementations",
};

describe("RendererCard", () => {
  it("renders the renderer name", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    expect(
      screen.getByText(/Physically Based Rendering Toolkit/),
    ).toBeInTheDocument();
  });

  it("renders technique badges", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    expect(screen.getByText("Path Tracing")).toBeInTheDocument();
  });

  it("renders the language", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    expect(screen.getByText("C++")).toBeInTheDocument();
  });

  it("links to the renderer profile page", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/renderer/pbrt");
  });

  it("wraps content in an article element", () => {
    render(<RendererCard renderer={mockRenderer} index={0} />);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("renders multiple technique badges", () => {
    const multiTechRenderer: RendererCardData = {
      ...mockRenderer,
      technique: ["path_tracing", "differentiable"],
    };
    render(<RendererCard renderer={multiTechRenderer} index={0} />);
    expect(screen.getByText("Path Tracing")).toBeInTheDocument();
    expect(screen.getByText("Differentiable")).toBeInTheDocument();
  });

  it("renders with different index values without error", () => {
    const { unmount } = render(
      <RendererCard renderer={mockRenderer} index={10} />,
    );
    expect(screen.getByText("PBRT v4")).toBeInTheDocument();
    unmount();
  });
});
