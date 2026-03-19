'use client';

/**
 * Scientific color lookup tables for heatmap visualization.
 *
 * Provides perceptually uniform colormaps (viridis, inferno, magma) used by
 * matplotlib and the scientific visualization community. These colormaps ensure
 * that equal steps in data produce visually equal steps in perceived brightness,
 * making them ideal for quantitative visualization.
 *
 * LUTs are generated at module init from degree-6 polynomial approximations
 * (Matt Zucker / mattz, Shadertoy). These match the matplotlib originals to
 * within ±1 RGB level — indistinguishable in practice.
 */

export type RGB = [number, number, number];
export type ColorMapName = 'viridis' | 'inferno' | 'magma';
type ColorMapLUT = RGB[];

// Polynomial coefficients for each colormap channel.
// Format: [c0, c1, c2, c3, c4, c5, c6] evaluated via Horner's method:
//   color = c0 + t*(c1 + t*(c2 + t*(c3 + t*(c4 + t*(c5 + t*c6)))))
// where t ∈ [0, 1], result clamped to [0, 1] then scaled to [0, 255].

interface PolyCoeffs {
  r: number[];
  g: number[];
  b: number[];
}

const VIRIDIS_COEFFS: PolyCoeffs = {
  r: [0.2777273272234177, 0.1050930431085774, -0.3308618287255563, -4.634230498983486, 6.228269936347081, 4.776384997670612, -5.435455855934631],
  g: [0.005407344544966578, 1.404613529898575, 0.214847559468213, -5.799100973351585, 14.17993336680509, -13.74514537774601, 4.645852612178535],
  b: [0.3340998053353061, 1.749539888003290, 0.09509516302823659, -19.33244095627987, 56.69055260068105, -65.35303263337234, 26.31245343835546],
};

const INFERNO_COEFFS: PolyCoeffs = {
  r: [0.0002189403691192265, 0.1065134194856116, 11.60249308247187, -41.70399613139459, 77.162935699427, -73.76882330631769, 27.16322241993687],
  g: [0.001651004631001012, 0.5639564367884091, -3.972853965665698, 17.43639888205313, -33.40235894210092, 32.62606426397723, -12.24266895238567],
  b: [-0.01948089843709184, 3.932712388889277, -15.9423941062914, 44.35414519872813, -81.80730925738993, 73.20951985803202, -23.07032500287172],
};

const MAGMA_COEFFS: PolyCoeffs = {
  r: [-0.002136485053939582, 0.2516605407371642, 8.353717279216625, -27.66873308576866, 52.17613981234068, -50.76852536473588, 18.65570506591883],
  g: [-0.000749655052795221, 0.6775232436837668, -3.577719514958484, 14.26473078096533, -27.94360607168351, 29.04658282127291, -11.48977351566529],
  b: [-0.005386127855323933, 2.494026599312351, 0.3144679030132573, -13.64921318813922, 12.94416944238394, 4.23415299384598, -5.601961508734096],
};

/** Evaluate a degree-6 polynomial at t using Horner's method. */
function evalPoly(coeffs: number[], t: number): number {
  // coeffs[6] is the highest-degree term
  let result = coeffs[6]!;
  for (let i = 5; i >= 0; i--) {
    result = result * t + coeffs[i]!;
  }
  return result;
}

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Build a 256-entry LUT from polynomial coefficients. */
function buildLUT(coeffs: PolyCoeffs): ColorMapLUT {
  const lut: ColorMapLUT = new Array<RGB>(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    lut[i] = [
      Math.round(clamp(evalPoly(coeffs.r, t), 0, 1) * 255),
      Math.round(clamp(evalPoly(coeffs.g, t), 0, 1) * 255),
      Math.round(clamp(evalPoly(coeffs.b, t), 0, 1) * 255),
    ];
  }
  return lut;
}

// Pre-compute all LUTs at module initialization (~negligible cost).
const LUT_CACHE: Record<ColorMapName, ColorMapLUT> = {
  viridis: buildLUT(VIRIDIS_COEFFS),
  inferno: buildLUT(INFERNO_COEFFS),
  magma: buildLUT(MAGMA_COEFFS),
};

/**
 * Returns the RGB color for a given scalar value using the specified colormap.
 * @param value Scalar in [0, 1] — clamped if out of range.
 * @param colormap Name of the colormap to use.
 */
export function getColor(value: number, colormap: ColorMapName): RGB {
  const idx = Math.round(clamp(value, 0, 1) * 255);
  return LUT_CACHE[colormap][idx]!;
}

/**
 * Returns the full 256-entry LUT for a given colormap name.
 */
export function getColorMap(name: ColorMapName): ColorMapLUT {
  return LUT_CACHE[name];
}

/** All available colormap names. */
export const COLOR_MAP_NAMES: ColorMapName[] = ['viridis', 'inferno', 'magma'];
