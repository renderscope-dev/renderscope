import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { Footer } from "./footer";

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

describe("Footer", () => {
  it("renders the footer element", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("displays the brand description", () => {
    render(<Footer />);
    expect(
      screen.getByText(/open source platform for cataloging/i),
    ).toBeInTheDocument();
  });

  it("displays all product links", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Explore Renderers")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
    expect(screen.getByText("Benchmarks")).toBeInTheDocument();
  });

  it("displays all resources links", () => {
    render(<Footer />);
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
  });

  it("displays community section", () => {
    render(<Footer />);
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Contributing")).toBeInTheDocument();
  });

  it("displays current year in copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("has Apache-2.0 license link", () => {
    render(<Footer />);
    const licenseLink = screen.getByText("Apache-2.0");
    expect(licenseLink).toBeInTheDocument();
    expect(licenseLink).toHaveAttribute(
      "href",
      "https://www.apache.org/licenses/LICENSE-2.0",
    );
  });

  it("has GitHub icon link with accessible label", () => {
    render(<Footer />);
    const githubLink = screen.getByLabelText("GitHub");
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("product links have correct hrefs", () => {
    render(<Footer />);
    const exploreLink = screen.getByText("Explore Renderers");
    expect(exploreLink.closest("a")).toHaveAttribute("href", "/explore");

    const galleryLink = screen.getByText("Gallery");
    expect(galleryLink.closest("a")).toHaveAttribute("href", "/gallery");
  });

  it("external community links open in new tabs", () => {
    render(<Footer />);
    // GitHub in community section is external
    const githubCommunityLink = screen.getAllByText("GitHub");
    // There might be multiple "GitHub" instances
    for (const link of githubCommunityLink) {
      const anchor = link.closest("a");
      if (anchor?.getAttribute("target") === "_blank") {
        expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
  });
});
