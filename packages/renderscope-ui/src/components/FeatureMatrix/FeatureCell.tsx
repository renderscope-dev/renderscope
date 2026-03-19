/**
 * FeatureCell — Individual cell in the FeatureMatrix.
 *
 * Renders a single ✓/✗/— icon indicating whether a renderer
 * supports a given feature. This is the most-rendered component
 * in the matrix (features × renderers), so it is kept lightweight.
 */

import { cx } from "../../utils/classnames";
import { CheckIcon, XIcon, MinusIcon } from "./FeatureMatrixIcons";
import type { FeatureCellProps } from "../../types/feature-matrix";

export function FeatureCell({ value }: FeatureCellProps) {
  if (value === true) {
    return (
      <td
        className={cx("rs-feature-cell", "rs-feature-cell--supported")}
        title="Supported"
      >
        <CheckIcon />
      </td>
    );
  }

  if (value === false) {
    return (
      <td
        className={cx("rs-feature-cell", "rs-feature-cell--unsupported")}
        title="Not supported"
      >
        <XIcon />
      </td>
    );
  }

  return (
    <td
      className={cx("rs-feature-cell", "rs-feature-cell--na")}
      title="Not applicable"
    >
      <MinusIcon />
    </td>
  );
}
