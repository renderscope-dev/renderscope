/**
 * FeatureGroupHeader — Collapsible category header row.
 *
 * Renders a full-width header row for a feature category that can
 * be clicked to collapse/expand its child feature rows. Supports
 * keyboard interaction (Enter/Space) for accessibility.
 */

import { useCallback } from "react";
import { cx } from "../../utils/classnames";
import { ChevronDownIcon } from "./FeatureMatrixIcons";
import type { FeatureGroupHeaderProps } from "../../types/feature-matrix";

export function FeatureGroupHeader({
  category,
  isCollapsed,
  onToggle,
  columnCount,
  collapsible,
}: FeatureGroupHeaderProps) {
  const featureCount = category.features.length;
  const ariaLabel = collapsible
    ? `${category.label}, ${featureCount} feature${featureCount !== 1 ? "s" : ""}, ${isCollapsed ? "collapsed" : "expanded"}. Click to ${isCollapsed ? "expand" : "collapse"}.`
    : `${category.label}, ${featureCount} feature${featureCount !== 1 ? "s" : ""}`;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!collapsible) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [collapsible, onToggle],
  );

  const handleClick = useCallback(() => {
    if (collapsible) onToggle();
  }, [collapsible, onToggle]);

  return (
    <tr
      className={cx(
        "rs-feature-group-header",
        isCollapsed && "rs-feature-group-header--collapsed",
      )}
    >
      <td
        colSpan={1 + columnCount}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? !isCollapsed : undefined}
        aria-label={ariaLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <span className="rs-feature-group-header__content">
          {collapsible && (
            <span
              className={cx(
                "rs-feature-group-chevron",
                isCollapsed && "rs-feature-group-chevron--collapsed",
              )}
            >
              <ChevronDownIcon />
            </span>
          )}
          <span className="rs-feature-group-header__label">
            {category.label}
          </span>
          <span className="rs-feature-group-header__count">
            ({featureCount})
          </span>
        </span>
      </td>
    </tr>
  );
}
