import { describe, it, expect } from "vitest";
import {
  extractTechniqueOptions,
  extractLanguageOptions,
  extractLicenseOptions,
  extractPlatformOptions,
  extractStatusOptions,
  applyFilters,
  countActiveFilters,
  hasActiveFilters,
} from "./filters";
import {
  mockRenderers,
} from "@/__tests__/mocks/renderers";
import { EMPTY_FILTERS, type FilterState } from "@/types/renderer";

// ─── Extract Options ──────────────────────────────────────

describe("extractTechniqueOptions", () => {
  it("returns options with counts", () => {
    const options = extractTechniqueOptions(mockRenderers);
    expect(options.length).toBeGreaterThan(0);
    // path_tracing appears in PBRT and Mitsuba
    const pathTracing = options.find((o) => o.value === "path_tracing");
    expect(pathTracing).toBeDefined();
    expect(pathTracing!.count).toBe(2);
  });

  it("sorts by count descending", () => {
    const options = extractTechniqueOptions(mockRenderers);
    for (let i = 1; i < options.length; i++) {
      expect(options[i]!.count).toBeLessThanOrEqual(options[i - 1]!.count);
    }
  });

  it("returns empty for empty input", () => {
    expect(extractTechniqueOptions([])).toEqual([]);
  });
});

describe("extractLanguageOptions", () => {
  it("returns unique languages with counts", () => {
    const options = extractLanguageOptions(mockRenderers);
    expect(options.length).toBeGreaterThan(0);
    // "C++" appears in PBRT and Filament
    const cpp = options.find((o) => o.value === "C++");
    expect(cpp).toBeDefined();
    expect(cpp!.count).toBe(2);
  });

  it("treats composite languages as single values", () => {
    const options = extractLanguageOptions(mockRenderers);
    const cppPython = options.find((o) => o.value === "C++/Python");
    expect(cppPython).toBeDefined();
    expect(cppPython!.count).toBe(1);
  });
});

describe("extractLicenseOptions", () => {
  it("returns unique licenses with counts", () => {
    const options = extractLicenseOptions(mockRenderers);
    expect(options.length).toBeGreaterThan(0);
    const mit = options.find((o) => o.value === "MIT");
    expect(mit).toBeDefined();
  });
});

describe("extractPlatformOptions", () => {
  it("returns unique platforms with counts", () => {
    const options = extractPlatformOptions(mockRenderers);
    const linux = options.find((o) => o.value === "linux");
    expect(linux).toBeDefined();
    expect(linux!.count).toBeGreaterThan(0);
  });
});

describe("extractStatusOptions", () => {
  it("returns options in severity order", () => {
    const options = extractStatusOptions(mockRenderers);
    expect(options.length).toBeGreaterThan(0);
    // All our mocks are active
    expect(options[0]!.value).toBe("active");
  });
});

// ─── Apply Filters ────────────────────────────────────────

describe("applyFilters", () => {
  it("returns all renderers when no filters active", () => {
    const result = applyFilters(mockRenderers, EMPTY_FILTERS);
    expect(result).toHaveLength(mockRenderers.length);
  });

  it("filters by technique (OR within group)", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      techniques: ["neural"],
    };
    const result = applyFilters(mockRenderers, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("nerfstudio");
  });

  it("OR logic: multiple techniques match any", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      techniques: ["neural", "rasterization"],
    };
    const result = applyFilters(mockRenderers, filters);
    // nerfstudio (neural), three.js (rasterization), filament (rasterization)
    expect(result).toHaveLength(3);
  });

  it("filters by language", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      languages: ["Python"],
    };
    const result = applyFilters(mockRenderers, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("nerfstudio");
  });

  it("filters by license", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      licenses: ["MIT"],
    };
    const result = applyFilters(mockRenderers, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("three-js");
  });

  it("filters by platform", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      platforms: ["web"],
    };
    const result = applyFilters(mockRenderers, filters);
    // three.js (web) + filament (web among others)
    expect(result).toHaveLength(2);
  });

  it("AND logic across groups", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      techniques: ["path_tracing"],
      languages: ["C++"],
    };
    const result = applyFilters(mockRenderers, filters);
    // PBRT: path_tracing + C++ ✓
    // Mitsuba: path_tracing + C++/Python ✗ (language doesn't match "C++")
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("pbrt");
  });

  it("returns empty when no renderers match", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      techniques: ["neural"],
      languages: ["C++"],
    };
    const result = applyFilters(mockRenderers, filters);
    expect(result).toHaveLength(0);
  });
});

// ─── Count / Has Active Filters ───────────────────────────

describe("countActiveFilters", () => {
  it("returns 0 for empty filters", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it("counts across all groups", () => {
    const filters: FilterState = {
      techniques: ["path_tracing", "neural"],
      languages: ["C++"],
      licenses: [],
      platforms: ["linux"],
      statuses: [],
    };
    expect(countActiveFilters(filters)).toBe(4);
  });
});

describe("hasActiveFilters", () => {
  it("returns false for empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when any filter is set", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      techniques: ["neural"],
    };
    expect(hasActiveFilters(filters)).toBe(true);
  });
});
