/**
 * Utility functions for renderscope-ui components.
 *
 * @packageDocumentation
 */

export { cx } from "./classnames";

export {
  loadImageData,
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computeMSE,
  computePSNR,
  computeSSIM,
  generateSSIMHeatmap,
  computeAllMetrics,
} from "./imageProcessing";
export type { LoadedImage } from "./imageProcessing";

export {
  getColor,
  getColorMap,
  COLOR_MAP_NAMES,
} from "./colorMaps";
export type { RGB } from "./colorMaps";
