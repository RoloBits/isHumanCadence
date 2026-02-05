/**
 * Abramowitz & Stegun rational approximation coefficients for the
 * cumulative normal distribution (eq. 26.2.17, p. 932).
 *
 * Source: Abramowitz, M. & Stegun, I.A. (1964).
 *   "Handbook of Mathematical Functions", National Bureau of Standards.
 *   https://personal.math.ubc.ca/~cbm/aands/page_932.htm
 *
 * Accuracy: |ε(x)| < 7.5 × 10⁻⁸ for all x.
 */
const AS_SCALING = 0.2316419;          // p  — input scaling factor
const INV_SQRT_2PI = 0.3989422804014327; // 1 / √(2π) — normal PDF prefactor
const AS_A1 =  0.31938153;            // a₁
const AS_A2 = -0.356563782;           // a₂
const AS_A3 =  1.781477937;           // a₃
const AS_A4 = -1.821255978;           // a₄
const AS_A5 =  1.330274429;           // a₅

/** Arithmetic mean of an array. Returns 0 for empty input. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/** Population standard deviation. Returns 0 for fewer than 2 values. */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
}

/** Clamp a number to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Normal CDF using Abramowitz & Stegun approximation (accuracy ~1.5e-7).
 * Used by the KS test to compare against a normal distribution.
 */
export function normalCDF(x: number): number {
  const abs = Math.abs(x);
  const t = 1 / (1 + AS_SCALING * abs);
  const p =
    INV_SQRT_2PI *
    Math.exp((-x * x) / 2) *
    (t *
      (AS_A1 +
        t *
          (AS_A2 +
            t * (AS_A3 + t * (AS_A4 + t * AS_A5)))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Shannon entropy of timing deltas, binned into `bins` equal-width buckets.
 * Returns entropy in bits. Higher entropy = more uniform distribution.
 */
export function shannonEntropy(values: number[], bins: number = 10): number {
  if (values.length < 2) return 0;

  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }

  const range = max - min;
  if (range === 0) return 0;

  const counts = new Uint32Array(bins);
  for (let i = 0; i < values.length; i++) {
    const idx = Math.min(Math.floor(((values[i] - min) / range) * bins), bins - 1);
    counts[idx]++;
  }

  let entropy = 0;
  const n = values.length;
  for (let i = 0; i < bins; i++) {
    if (counts[i] === 0) continue;
    const p = counts[i] / n;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Autocorrelation at lag-1. Measures serial dependency in timing data.
 * Humans show r ≈ 0.1–0.4 (digraph effects). Random jitter shows r ≈ 0.0.
 */
export function autocorrelation(values: number[]): number {
  if (values.length < 3) return 0;
  const m = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m;
    den += d * d;
    if (i > 0) {
      num += d * (values[i - 1] - m);
    }
  }
  return den === 0 ? 0 : num / den;
}

/** Sigmoid function for normalizing a raw metric to [0, 1]. */
export function sigmoid(x: number, k: number, midpoint: number): number {
  return 1 / (1 + Math.exp(-k * (x - midpoint)));
}
