import { describe, it, expect } from "vitest";
import { cx } from "./classnames";

describe("cx (classnames utility)", () => {
  it("merges multiple class strings", () => {
    expect(cx("a", "b")).toBe("a b");
  });

  it("merges three class strings", () => {
    expect(cx("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out false values", () => {
    expect(cx("a", false, "b")).toBe("a b");
  });

  it("filters out null values", () => {
    expect(cx("a", null, "b")).toBe("a b");
  });

  it("filters out undefined values", () => {
    expect(cx("a", undefined, "b")).toBe("a b");
  });

  it("filters out 0 values", () => {
    expect(cx("a", 0, "b")).toBe("a b");
  });

  it("filters out mixed falsy values", () => {
    expect(cx("a", false, null, undefined, "b", 0, "c")).toBe("a b c");
  });

  it("returns empty string for no arguments", () => {
    expect(cx()).toBe("");
  });

  it("returns empty string for all falsy arguments", () => {
    expect(cx(false, null, undefined, 0)).toBe("");
  });

  it("handles a single class", () => {
    expect(cx("only")).toBe("only");
  });

  it("preserves whitespace within class names", () => {
    // Edge case: if someone passes a string with spaces, it's preserved
    expect(cx("a b", "c")).toBe("a b c");
  });
});
