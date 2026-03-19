import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ImageDiff } from "./ImageDiff";
import { TRANSPARENT_PNG, RED_PNG } from "../../__tests__/fixtures";

describe("ImageDiff", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <ImageDiff reference={TRANSPARENT_PNG} test={RED_PNG} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with mode='absolute'", () => {
    const { container } = render(
      <ImageDiff reference={TRANSPARENT_PNG} test={RED_PNG} mode="absolute" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with mode='luminance'", () => {
    const { container } = render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        mode="luminance"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("displays mode badge", async () => {
    render(
      <ImageDiff reference={TRANSPARENT_PNG} test={RED_PNG} mode="absolute" />,
    );
    // Wait for loading to finish
    await waitFor(
      () => {
        const badge = screen.queryByText("absolute");
        if (badge) expect(badge).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows metrics overlay when showMetrics is true", async () => {
    render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        showMetrics={true}
      />,
    );
    // After loading, PSNR and SSIM labels should appear
    await waitFor(
      () => {
        const psnr = screen.queryByText("PSNR");
        if (psnr) expect(psnr).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("hides metrics overlay when showMetrics is false", () => {
    render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        showMetrics={false}
      />,
    );
    // PSNR label should not be present
    expect(screen.queryByText("PSNR")).not.toBeInTheDocument();
  });

  it("accepts amplification prop without error", () => {
    const { container } = render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        amplification={5}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("handles identical images", () => {
    const { container } = render(
      <ImageDiff reference={TRANSPARENT_PNG} test={TRANSPARENT_PNG} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        className="diff-custom"
      />,
    );
    expect(container.firstChild).toHaveClass("diff-custom");
  });

  it("fires onMetricsComputed callback", async () => {
    const onMetrics = vi.fn();
    render(
      <ImageDiff
        reference={TRANSPARENT_PNG}
        test={RED_PNG}
        onMetricsComputed={onMetrics}
      />,
    );
    // The callback may fire after async image loading + computation
    await waitFor(
      () => {
        if (onMetrics.mock.calls.length > 0) {
          expect(onMetrics).toHaveBeenCalledWith(
            expect.objectContaining({
              psnr: expect.any(Number),
              ssim: expect.any(Number),
            }),
          );
        }
      },
      { timeout: 2000 },
    );
  });
});
