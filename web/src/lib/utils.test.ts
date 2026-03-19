import { describe, it, expect } from "vitest";
import {
  cn,
  formatStars,
  sortRenderers,
  formatSlug,
  formatDate,
  formatUrl,
  formatListWithFallback,
  formatRelativeDate,
  calculateTrend,
  formatRenderTime,
  formatCount,
  formatTestLabel,
  releaseFreshness,
} from "./utils";

// ─── cn (Tailwind class merging) ──────────────────────────

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("px-4", "px-2");
    expect(result).toBe("px-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles empty/undefined inputs", () => {
    expect(cn("", undefined, null)).toBe("");
  });
});

// ─── formatStars ──────────────────────────────────────────

describe("formatStars", () => {
  it("returns em dash for undefined", () => {
    expect(formatStars(undefined)).toBe("—");
  });

  it("returns raw number for small values", () => {
    expect(formatStars(42)).toBe("42");
    expect(formatStars(999)).toBe("999");
  });

  it("formats thousands with k suffix", () => {
    expect(formatStars(1000)).toBe("1.0k");
    expect(formatStars(1500)).toBe("1.5k");
    expect(formatStars(9999)).toBe("10.0k");
  });

  it("formats ten-thousands without decimal", () => {
    expect(formatStars(10000)).toBe("10k");
    expect(formatStars(15000)).toBe("15k");
    expect(formatStars(102000)).toBe("102k");
  });

  it("handles zero", () => {
    expect(formatStars(0)).toBe("0");
  });
});

// ─── sortRenderers ────────────────────────────────────────

describe("sortRenderers", () => {
  const renderers = [
    { name: "Mitsuba", github_stars: 2100, first_release: "2022-07-27" },
    { name: "PBRT", github_stars: 4800, first_release: "2004-07-01" },
    { name: "three.js", github_stars: 102000, first_release: "2010-04-24" },
  ];

  it("sorts by name ascending", () => {
    const sorted = sortRenderers(renderers, "name-asc");
    expect(sorted.map((r) => r.name)).toEqual(["Mitsuba", "PBRT", "three.js"]);
  });

  it("sorts by name descending", () => {
    const sorted = sortRenderers(renderers, "name-desc");
    expect(sorted.map((r) => r.name)).toEqual(["three.js", "PBRT", "Mitsuba"]);
  });

  it("sorts by stars descending", () => {
    const sorted = sortRenderers(renderers, "stars-desc");
    expect(sorted[0]!.name).toBe("three.js");
    expect(sorted[2]!.name).toBe("Mitsuba");
  });

  it("sorts by stars ascending", () => {
    const sorted = sortRenderers(renderers, "stars-asc");
    expect(sorted[0]!.name).toBe("Mitsuba");
  });

  it("sorts by newest first", () => {
    const sorted = sortRenderers(renderers, "newest");
    expect(sorted[0]!.name).toBe("Mitsuba");
    expect(sorted[2]!.name).toBe("PBRT");
  });

  it("sorts by oldest first", () => {
    const sorted = sortRenderers(renderers, "oldest");
    expect(sorted[0]!.name).toBe("PBRT");
  });

  it("does not mutate the original array", () => {
    const original = [...renderers];
    sortRenderers(renderers, "name-desc");
    expect(renderers).toEqual(original);
  });

  it("handles renderers without github_stars", () => {
    const withMissing = [
      { name: "A", first_release: "" },
      { name: "B", github_stars: 100, first_release: "" },
    ];
    const sorted = sortRenderers(withMissing, "stars-desc");
    expect(sorted[0]!.name).toBe("B");
  });
});

// ─── formatSlug ───────────────────────────────────────────

describe("formatSlug", () => {
  it("uses override map for known slugs", () => {
    expect(formatSlug("pbrt")).toBe("PBRT");
    expect(formatSlug("mitsuba3")).toBe("Mitsuba 3");
    expect(formatSlug("three-js")).toBe("three.js");
    expect(formatSlug("pytorch3d")).toBe("PyTorch3D");
  });

  it("title-cases unknown slugs", () => {
    expect(formatSlug("my-renderer")).toBe("My Renderer");
    expect(formatSlug("some-tool")).toBe("Some Tool");
  });

  it("handles single-word slugs", () => {
    expect(formatSlug("ospray")).toBe("Ospray");
  });
});

// ─── formatDate ───────────────────────────────────────────

describe("formatDate", () => {
  it("formats ISO date to month and year", () => {
    expect(formatDate("2023-03-28")).toBe("Mar 2023");
    expect(formatDate("2004-07-15")).toBe("Jul 2004");
  });

  it("returns raw string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("")).toBe("");
  });
});

// ─── formatUrl ────────────────────────────────────────────

describe("formatUrl", () => {
  it("extracts hostname from full URL", () => {
    expect(formatUrl("https://mitsuba-renderer.org/docs")).toBe(
      "mitsuba-renderer.org"
    );
    expect(formatUrl("https://github.com/mmp/pbrt-v4")).toBe("github.com");
  });

  it("returns raw string for invalid URL", () => {
    expect(formatUrl("not-a-url")).toBe("not-a-url");
  });
});

// ─── formatListWithFallback ───────────────────────────────

describe("formatListWithFallback", () => {
  const labels: Record<string, string> = {
    cuda: "CUDA",
    vulkan: "Vulkan",
    metal: "Metal",
  };

  it("maps known items to labels", () => {
    expect(formatListWithFallback(["cuda", "vulkan"], labels)).toBe(
      "CUDA, Vulkan"
    );
  });

  it("formats unknown items as title case", () => {
    expect(formatListWithFallback(["webgl", "webgpu"], labels)).toBe(
      "Webgl, Webgpu"
    );
  });

  it("returns empty string for empty array", () => {
    expect(formatListWithFallback([], labels)).toBe("");
  });
});

// ─── formatRelativeDate ───────────────────────────────────

describe("formatRelativeDate", () => {
  it("returns 'today' for today's date", () => {
    const today = new Date().toISOString().split("T")[0]!;
    expect(formatRelativeDate(today)).toBe("today");
  });

  it("returns 'in the future' for future dates", () => {
    const future = new Date(Date.now() + 86400000 * 30)
      .toISOString()
      .split("T")[0]!;
    expect(formatRelativeDate(future)).toBe("in the future");
  });

  it("returns raw string for invalid date", () => {
    expect(formatRelativeDate("bad")).toBe("bad");
  });
});

// ─── calculateTrend ───────────────────────────────────────

describe("calculateTrend", () => {
  it("returns 'up' for significantly increasing values", () => {
    expect(calculateTrend([100, 110, 120])).toBe("up");
  });

  it("returns 'down' for significantly decreasing values", () => {
    expect(calculateTrend([100, 90, 80])).toBe("down");
  });

  it("returns 'stable' for flat values", () => {
    expect(calculateTrend([100, 101, 102])).toBe("stable");
  });

  it("returns 'stable' for undefined or short arrays", () => {
    expect(calculateTrend(undefined)).toBe("stable");
    expect(calculateTrend([])).toBe("stable");
    expect(calculateTrend([100])).toBe("stable");
  });

  it("handles zero first value", () => {
    expect(calculateTrend([0, 10])).toBe("up");
    expect(calculateTrend([0, 0])).toBe("stable");
  });
});

// ─── formatRenderTime ─────────────────────────────────────

describe("formatRenderTime", () => {
  it("returns em dash for null", () => {
    expect(formatRenderTime(null)).toBe("\u2014");
  });

  it("formats sub-second as milliseconds", () => {
    expect(formatRenderTime(0.5)).toBe("500ms");
    expect(formatRenderTime(0.023)).toBe("23ms");
  });

  it("formats seconds with one decimal", () => {
    expect(formatRenderTime(1)).toBe("1.0s");
    expect(formatRenderTime(47.3)).toBe("47.3s");
  });

  it("formats minutes", () => {
    expect(formatRenderTime(60)).toBe("1m");
    expect(formatRenderTime(134)).toBe("2m 14s");
    expect(formatRenderTime(300)).toBe("5m");
  });

  it("formats hours", () => {
    expect(formatRenderTime(3600)).toBe("1h");
    expect(formatRenderTime(3661)).toBe("1h 1m");
    expect(formatRenderTime(7200)).toBe("2h");
  });
});

// ─── formatCount ──────────────────────────────────────────

describe("formatCount", () => {
  it("formats with locale-aware separators", () => {
    expect(formatCount(36)).toBe("36");
    expect(formatCount(1000)).toBe("1,000");
    expect(formatCount(35947)).toBe("35,947");
  });
});

// ─── formatTestLabel ──────────────────────────────────────

describe("formatTestLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatTestLabel("global_illumination")).toBe("Global Illumination");
    expect(formatTestLabel("subsurface_scattering")).toBe(
      "Subsurface Scattering"
    );
  });

  it("handles single word", () => {
    expect(formatTestLabel("caustics")).toBe("Caustics");
  });
});

// ─── releaseFreshness ─────────────────────────────────────

describe("releaseFreshness", () => {
  it("returns 'fresh' for recent releases", () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]!;
    expect(releaseFreshness(recent)).toBe("fresh");
  });

  it("returns 'aging' for 3-12 month old releases", () => {
    const aging = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]!;
    expect(releaseFreshness(aging)).toBe("aging");
  });

  it("returns 'stale' for releases older than 12 months", () => {
    expect(releaseFreshness("2020-01-01")).toBe("stale");
  });

  it("returns 'stale' for invalid dates", () => {
    expect(releaseFreshness("not-a-date")).toBe("stale");
  });
});
