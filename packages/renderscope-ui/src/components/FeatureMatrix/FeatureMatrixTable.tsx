/**
 * FeatureMatrixTable — Scrollable table with sticky positioning.
 *
 * Renders the full HTML table within a scrollable container.
 * Features a sticky header row, sticky first column (feature names),
 * and CSS-only tooltips for feature descriptions.
 *
 * @internal Receives props from the FeatureMatrix orchestrator.
 */

import type { RefObject } from "react";
import { cx } from "../../utils/classnames";
import { FeatureCell } from "./FeatureCell";
import { FeatureGroupHeader } from "./FeatureGroupHeader";
import { InfoIcon, CloseIcon } from "./FeatureMatrixIcons";
import type {
  FeatureMatrixRenderer,
  FeatureCategory,
} from "../../types/feature-matrix";

interface FeatureMatrixTableProps {
  renderers: FeatureMatrixRenderer[];
  features: FeatureCategory[];
  collapsedGroups: Set<string>;
  highlightDifferences: boolean;
  collapsible: boolean;
  stickyHeader: boolean;
  onToggleGroup: (groupId: string) => void;
  onRendererClick?: (rendererId: string) => void;
  onRendererRemove?: (rendererId: string) => void;
  tableRef: RefObject<HTMLDivElement>;
}

function allValuesSame(
  renderers: FeatureMatrixRenderer[],
  featureKey: string,
): boolean {
  const values = renderers.map((r) => r.features[featureKey] ?? null);
  const first = values[0];
  return values.every((v) => v === first);
}

export function FeatureMatrixTable({
  renderers,
  features,
  collapsedGroups,
  highlightDifferences,
  collapsible,
  stickyHeader,
  onToggleGroup,
  onRendererClick,
  onRendererRemove,
  tableRef,
}: FeatureMatrixTableProps) {
  const totalFeatures = features.reduce(
    (sum, cat) => sum + cat.features.length,
    0,
  );

  return (
    <div
      className={cx(
        "rs-feature-matrix-scroll",
        stickyHeader && "rs-feature-matrix-scroll--sticky",
      )}
      ref={tableRef}
    >
      <table className="rs-feature-matrix-table">
        <caption className="rs-sr-only">
          Feature comparison of {renderers.length} renderer
          {renderers.length !== 1 ? "s" : ""} across {totalFeatures} features
        </caption>
        <thead>
          <tr>
            <th className="rs-feature-matrix-corner" scope="col">
              <span className="rs-sr-only">Feature</span>
            </th>
            {renderers.map((renderer) => (
              <th
                key={renderer.id}
                scope="col"
                className="rs-feature-matrix-renderer-header"
              >
                <span className="rs-feature-matrix-renderer-header__content">
                  <span
                    className={cx(
                      "rs-feature-matrix-renderer-header__name",
                      onRendererClick &&
                        "rs-feature-matrix-renderer-header__name--clickable",
                    )}
                    onClick={
                      onRendererClick
                        ? () => onRendererClick(renderer.id)
                        : undefined
                    }
                    onKeyDown={
                      onRendererClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRendererClick(renderer.id);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRendererClick ? 0 : undefined}
                    role={onRendererClick ? "button" : undefined}
                  >
                    {renderer.name}
                  </span>
                  {onRendererRemove && (
                    <button
                      className="rs-feature-matrix-renderer-header__remove"
                      onClick={() => onRendererRemove(renderer.id)}
                      aria-label={`Remove ${renderer.name} from comparison`}
                      type="button"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((category) => {
            const isCollapsed = collapsedGroups.has(category.id);
            return (
              <FeatureCategoryGroup
                key={category.id}
                category={category}
                renderers={renderers}
                isCollapsed={isCollapsed}
                onToggle={() => onToggleGroup(category.id)}
                collapsible={collapsible}
                highlightDifferences={highlightDifferences}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Category group (header + feature rows) ── */

interface FeatureCategoryGroupProps {
  category: FeatureCategory;
  renderers: FeatureMatrixRenderer[];
  isCollapsed: boolean;
  onToggle: () => void;
  collapsible: boolean;
  highlightDifferences: boolean;
}

function FeatureCategoryGroup({
  category,
  renderers,
  isCollapsed,
  onToggle,
  collapsible,
  highlightDifferences,
}: FeatureCategoryGroupProps) {
  return (
    <>
      <FeatureGroupHeader
        category={category}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        columnCount={renderers.length}
        collapsible={collapsible}
      />
      {!isCollapsed &&
        category.features.map((feature) => {
          const isSame = allValuesSame(renderers, feature.key);
          const dimmed = highlightDifferences && isSame;

          return (
            <tr
              key={feature.key}
              className={cx(
                "rs-feature-row",
                dimmed && "rs-feature-row--dimmed",
              )}
            >
              <th scope="row" className="rs-feature-label">
                <span className="rs-feature-label__text">
                  {feature.label}
                </span>
                {feature.description && (
                  <span
                    className="rs-feature-tooltip-wrapper"
                    tabIndex={0}
                  >
                    <InfoIcon className="rs-feature-tooltip-icon" />
                    <span className="rs-feature-tooltip" role="tooltip">
                      {feature.description}
                    </span>
                  </span>
                )}
              </th>
              {renderers.map((renderer) => (
                <FeatureCell
                  key={renderer.id}
                  value={renderer.features[feature.key]}
                />
              ))}
            </tr>
          );
        })}
    </>
  );
}
