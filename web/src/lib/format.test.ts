import { describe, it, expect } from "vitest";
import { formatMemory, formatPSNR, formatSSIM } from "./format";

describe("formatMemory", () => {
  it("formats values under 1024 MB as MB", () => {
    expect(formatMemory(340)).toBe("340 MB");
    expect(formatMemory(512)).toBe("512 MB");
    expect(formatMemory(1)).toBe("1 MB");
    expect(formatMemory(0)).toBe("0 MB");
  });

  it("rounds sub-megabyte values", () => {
    expect(formatMemory(340.6)).toBe("341 MB");
    expect(formatMemory(99.4)).toBe("99 MB");
  });

  it("formats values at or above 1024 MB as GB", () => {
    expect(formatMemory(1024)).toBe("1.0 GB");
    expect(formatMemory(1536)).toBe("1.5 GB");
    expect(formatMemory(2048)).toBe("2.0 GB");
    expect(formatMemory(10240)).toBe("10.0 GB");
  });

  it("formats fractional GB values with one decimal", () => {
    expect(formatMemory(1280)).toBe("1.3 GB");
    expect(formatMemory(3584)).toBe("3.5 GB");
  });
});

describe("formatPSNR", () => {
  it("formats with one decimal and dB unit", () => {
    expect(formatPSNR(42.1)).toBe("42.1 dB");
    expect(formatPSNR(30.0)).toBe("30.0 dB");
    expect(formatPSNR(99.99)).toBe("100.0 dB");
  });

  it("formats zero correctly", () => {
    expect(formatPSNR(0)).toBe("0.0 dB");
  });

  it("handles high precision input", () => {
    expect(formatPSNR(32.45678)).toBe("32.5 dB");
  });
});

describe("formatSSIM", () => {
  it("formats to four decimal places", () => {
    expect(formatSSIM(0.9987)).toBe("0.9987");
    expect(formatSSIM(1.0)).toBe("1.0000");
    expect(formatSSIM(0.5)).toBe("0.5000");
  });

  it("formats zero correctly", () => {
    expect(formatSSIM(0)).toBe("0.0000");
  });

  it("rounds to four decimals", () => {
    expect(formatSSIM(0.99876543)).toBe("0.9988");
  });
});
