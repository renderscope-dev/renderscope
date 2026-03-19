import { useEffect, useRef } from "react";

/**
 * Focusable element selector for finding tabbable elements within a container.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

interface UseFocusTrapOptions {
  /** Called when Escape is pressed while the trap is active. */
  onEscape?: () => void;
  /** Element to focus when the trap activates. If not provided, focuses the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Whether to restore focus to the previously-focused element when the trap deactivates. Default: true. */
  restoreFocus?: boolean;
}

/**
 * Traps keyboard focus within a container element.
 *
 * When active, Tab and Shift+Tab cycle through focusable elements
 * inside the container. Focus cannot escape to elements behind the
 * container (e.g., behind a modal overlay). When the trap deactivates,
 * focus is restored to whichever element was focused before activation.
 *
 * @param containerRef - Ref to the container element that should trap focus.
 * @param isActive - Whether the focus trap is currently active.
 * @param options - Configuration options.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  options: UseFocusTrapOptions = {}
): void {
  const { onEscape, initialFocusRef, restoreFocus = true } = options;
  const returnFocusRef = useRef<Element | null>(null);

  // Store the element that had focus before the trap activated
  useEffect(() => {
    if (isActive) {
      returnFocusRef.current = document.activeElement;

      // Focus the initial element or the first focusable element
      requestAnimationFrame(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          const container = containerRef.current;
          if (container) {
            const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
            firstFocusable?.focus();
          }
        }
      });
    } else if (restoreFocus && returnFocusRef.current) {
      const target = returnFocusRef.current as HTMLElement;
      requestAnimationFrame(() => {
        target?.focus?.();
      });
      returnFocusRef.current = null;
    }
  }, [isActive, containerRef, initialFocusRef, restoreFocus]);

  // Handle keydown events for Tab cycling and Escape
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstFocusable = focusableElements[0]!;
      const lastFocusable = focusableElements[focusableElements.length - 1]!;

      if (e.shiftKey) {
        // Shift+Tab: if focus is on the first element, wrap to the last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: if focus is on the last element, wrap to the first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isActive, containerRef, onEscape]);
}
