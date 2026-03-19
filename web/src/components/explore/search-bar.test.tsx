import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@/__tests__/test-utils";
import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  const defaultProps = {
    query: "",
    onQueryChange: vi.fn(),
    resultCount: 10,
    totalCount: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with placeholder text", () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search renderers...");
    expect(input).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByLabelText("Search renderers");
    expect(input).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint", () => {
    render(<SearchBar {...defaultProps} />);
    // The kbd element should exist (hidden on mobile via sm:inline-flex)
    const kbd = screen.getByText("K");
    expect(kbd).toBeInTheDocument();
  });

  it("does not show clear button when query is empty", () => {
    render(<SearchBar {...defaultProps} query="" />);
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
  });

  it("shows clear button when query is non-empty", () => {
    render(<SearchBar {...defaultProps} query="pbrt" />);
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("calls onQueryChange with empty string when clear button is clicked", async () => {
    const onQueryChange = vi.fn();
    render(
      <SearchBar {...defaultProps} query="test" onQueryChange={onQueryChange} />,
    );

    const clearBtn = screen.getByLabelText("Clear search");
    await act(async () => {
      clearBtn.click();
    });

    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("debounces input changes by 300ms", async () => {
    const onQueryChange = vi.fn();
    render(
      <SearchBar {...defaultProps} onQueryChange={onQueryChange} />,
    );

    const input = screen.getByLabelText("Search renderers");

    await act(async () => {
      // Simulate a native change event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "test");
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Should not be called immediately
    expect(onQueryChange).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onQueryChange).toHaveBeenCalledWith("test");
  });

  it("syncs input value with external query prop", () => {
    const { rerender } = render(<SearchBar {...defaultProps} query="" />);
    const input = screen.getByLabelText("Search renderers") as HTMLInputElement;
    expect(input.value).toBe("");

    rerender(<SearchBar {...defaultProps} query="updated" />);
    expect(input.value).toBe("updated");
  });

  it("applies custom className", () => {
    render(
      <SearchBar {...defaultProps} className="custom-class" />,
    );
    // The search input's parent div gets the className
    const input = screen.getByLabelText("Search renderers");
    const wrapper = input.closest(".relative");
    expect(wrapper?.className).toContain("custom-class");
  });
});
