import { useState, useCallback, useRef } from "react";

type Orientation = "horizontal" | "vertical" | "grid";

interface UseRovingTabindexOptions {
  /** Navigation orientation. Default: "horizontal". */
  orientation?: Orientation;
  /** Number of columns for grid orientation. Required when orientation is "grid". */
  columns?: number;
  /** Whether to wrap around at the ends. Default: true. */
  loop?: boolean;
  /** Called when a new item becomes the active (focused) item. */
  onActivate?: (index: number) => void;
}

interface RovingProps {
  tabIndex: 0 | -1;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  ref: (el: HTMLElement | null) => void;
}

interface UseRovingTabindexReturn {
  /** Index of the currently active (tabIndex=0) item. */
  activeIndex: number;
  /** Set the active index programmatically. */
  setActiveIndex: (index: number) => void;
  /** Get the tabIndex value for a specific item index. */
  getTabIndex: (index: number) => 0 | -1;
  /** Get all roving-tabindex props for a specific item index. Spread onto the element. */
  getRovingProps: (index: number) => RovingProps;
  /** Total number of registered items. */
  itemCount: number;
}

/**
 * Implements the roving tabindex pattern for composite widgets.
 *
 * Only one element in the group has `tabIndex={0}` (the "active" element).
 * All others have `tabIndex={-1}`. Arrow keys move the active element.
 * Tab enters the group at the active element, and the next Tab exits.
 *
 * This is the standard WAI-ARIA pattern for grids, trees, tablists,
 * and toolbars.
 *
 * @param totalItems - Total number of items in the group.
 * @param options - Configuration options.
 */
export function useRovingTabindex(
  totalItems: number,
  options: UseRovingTabindexOptions = {}
): UseRovingTabindexReturn {
  const {
    orientation = "horizontal",
    columns = 1,
    loop = true,
    onActivate,
  } = options;

  const [activeIndex, setActiveIndexState] = useState(0);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const setActiveIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalItems - 1));
      setActiveIndexState(clamped);
      onActivate?.(clamped);

      // Focus the element at the new index
      const el = itemRefs.current.get(clamped);
      el?.focus();
    },
    [totalItems, onActivate]
  );

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => (index === activeIndex ? 0 : -1),
    [activeIndex]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight": {
          if (orientation === "vertical") break;
          e.preventDefault();
          nextIndex = index + 1;
          if (nextIndex >= totalItems) {
            nextIndex = loop ? 0 : totalItems - 1;
          }
          break;
        }
        case "ArrowLeft": {
          if (orientation === "vertical") break;
          e.preventDefault();
          nextIndex = index - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? totalItems - 1 : 0;
          }
          break;
        }
        case "ArrowDown": {
          if (orientation === "horizontal") break;
          e.preventDefault();
          if (orientation === "grid") {
            nextIndex = index + columns;
            if (nextIndex >= totalItems) {
              nextIndex = loop ? index % columns : index;
            }
          } else {
            nextIndex = index + 1;
            if (nextIndex >= totalItems) {
              nextIndex = loop ? 0 : totalItems - 1;
            }
          }
          break;
        }
        case "ArrowUp": {
          if (orientation === "horizontal") break;
          e.preventDefault();
          if (orientation === "grid") {
            nextIndex = index - columns;
            if (nextIndex < 0) {
              nextIndex = loop
                ? totalItems - columns + (index % columns)
                : index;
              if (nextIndex >= totalItems) nextIndex = index;
            }
          } else {
            nextIndex = index - 1;
            if (nextIndex < 0) {
              nextIndex = loop ? totalItems - 1 : 0;
            }
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          nextIndex = 0;
          break;
        }
        case "End": {
          e.preventDefault();
          nextIndex = totalItems - 1;
          break;
        }
      }

      if (nextIndex !== null && nextIndex !== index) {
        setActiveIndex(nextIndex);
      }
    },
    [orientation, columns, loop, totalItems, setActiveIndex]
  );

  const getRovingProps = useCallback(
    (index: number): RovingProps => ({
      tabIndex: getTabIndex(index),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
      onFocus: () => {
        setActiveIndexState(index);
      },
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
    [getTabIndex, handleKeyDown]
  );

  return {
    activeIndex,
    setActiveIndex,
    getTabIndex,
    getRovingProps,
    itemCount: totalItems,
  };
}
