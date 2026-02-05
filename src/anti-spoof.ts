import { normalCDF, autocorrelation, mean, stddev } from './utils';

// ── KS test parameters ──
const MIN_KS_SAMPLES = 5;
const KS_CRITICAL_COEFF = 1.22;       // α=0.10 (see computeLogNormalityScore comment)
const KS_PASS_BASELINE = 0.7;         // score when D ≤ critical
const KS_PASS_BONUS = 0.3;            // additional range [0.7, 1.0]
const KS_FAIL_BASELINE = 0.7;         // numerator when D > critical

// ── detectSpoof weights ──
const AUTOCORR_NOISE_FLOOR = 0.05;    // below this, treat as zero
const AUTOCORR_HUMAN_MAX = 0.3;       // normalization cap
const SPOOF_WEIGHT_LOGNORMALITY = 0.45;
const SPOOF_WEIGHT_UNIFORMITY = 0.30;
const SPOOF_WEIGHT_AUTOCORR = 0.25;

/**
 * One-sample Kolmogorov-Smirnov test statistic.
 * Returns the max absolute deviation between the empirical CDF
 * of `samples` and a theoretical CDF function.
 * Samples are sorted in place.
 */
function ksStatistic(samples: number[], cdf: (x: number) => number): number {
  samples.sort((a, b) => a - b);
  const n = samples.length;
  let maxD = 0;

  for (let i = 0; i < n; i++) {
    const empirical = (i + 1) / n;
    const theoretical = cdf(samples[i]);
    const d1 = Math.abs(empirical - theoretical);
    const d2 = Math.abs((i / n) - theoretical);
    const d = Math.max(d1, d2);
    if (d > maxD) maxD = d;
  }

  return maxD;
}

/**
 * Test how well flight times fit a log-normal distribution.
 * Returns a score 0–1 where higher = better fit = more human-like.
 *
 * Method: log-transform the data, then KS test against normal CDF
 * with estimated mean and stddev from the transformed data.
 */
export function computeLogNormalityScore(flights: number[]): number {
  if (flights.length < MIN_KS_SAMPLES) return 0.5; // insufficient data, neutral

  // Log-transform, filtering out non-positive values
  const logged: number[] = [];
  for (let i = 0; i < flights.length; i++) {
    if (flights[i] > 0) logged.push(Math.log(flights[i]));
  }
  if (logged.length < MIN_KS_SAMPLES) return 0.5;

  const mu = mean(logged);
  const sigma = stddev(logged);
  if (sigma === 0) return 0; // constant values → not human

  // KS test against normal(mu, sigma)
  const D = ksStatistic([...logged], (x) => normalCDF((x - mu) / sigma));

  // KS critical value: 1.22 / √n corresponds to α=0.10.
  // Relaxed from α=0.05 (1.36) because human flight times are a mixture of
  // digraph-specific distributions that fail a strict single-distribution KS
  // test even for genuine data. α=0.10 lets more real humans pass (score ≥ 0.7)
  // without affecting bot detection (constant bots hit σ=0 early-return;
  // uniform bots are penalized harder via the 1−uniformity term).
  const critical = KS_CRITICAL_COEFF / Math.sqrt(logged.length);

  // Convert D to a score: D < critical → good fit → high score
  // Use ratio: score approaches 1 as D approaches 0
  if (D <= critical) {
    return KS_PASS_BASELINE + KS_PASS_BONUS * (1 - D / critical);
  }
  // D > critical: score drops below baseline
  return Math.max(0, KS_FAIL_BASELINE * (critical / D));
}

/**
 * Test how well flight times fit a uniform distribution.
 * Returns a score 0–1 where higher = better fit to uniform = more bot-like.
 */
export function computeUniformityScore(flights: number[]): number {
  if (flights.length < MIN_KS_SAMPLES) return 0.5;

  const sorted = [...flights].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  if (range === 0) return 0; // constant is not uniform, it's degenerate

  // KS test against uniform(min, max)
  const D = ksStatistic([...sorted], (x) => (x - min) / range);
  // KS critical value at α=0.10 — see computeLogNormalityScore for rationale.
  const critical = KS_CRITICAL_COEFF / Math.sqrt(flights.length);

  if (D <= critical) {
    return KS_PASS_BASELINE + KS_PASS_BONUS * (1 - D / critical);
  }
  return Math.max(0, KS_FAIL_BASELINE * (critical / D));
}

export interface SpoofResult {
  /** 0 = definitely spoofed, 1 = definitely genuine */
  genuineScore: number;
  /** Log-normality fit score (higher = more human-like timing) */
  logNormality: number;
  /** Uniformity fit score (higher = more bot-like timing) */
  uniformity: number;
  /** Lag-1 autocorrelation (humans ~0.1–0.4, random jitter ~0.0) */
  serialCorrelation: number;
}

/**
 * Composite spoof detection combining distribution analysis and
 * serial correlation. Returns a genuineScore where higher = more
 * likely to be genuine human input.
 */
export function detectSpoof(flights: number[]): SpoofResult {
  const logNormality = computeLogNormalityScore(flights);
  const uniformity = computeUniformityScore(flights);
  const serialCorrelation = flights.length >= 3 ? autocorrelation(flights) : 0;

  // Combine signals:
  // 1. High log-normality → human (positive signal)
  // 2. High uniformity → bot (negative signal)
  // 3. Near-zero autocorrelation → random jitter bot (negative signal)

  // Autocorrelation score: humans have moderate positive correlation
  // Map abs(correlation) through a soft threshold
  const absCorr = Math.abs(serialCorrelation);
  const corrScore = absCorr > AUTOCORR_NOISE_FLOOR ? Math.min(1, absCorr / AUTOCORR_HUMAN_MAX) : 0;

  // Weighted combination
  const genuineScore = Math.max(0, Math.min(1,
    SPOOF_WEIGHT_LOGNORMALITY * logNormality +
    SPOOF_WEIGHT_UNIFORMITY * (1 - uniformity) +
    SPOOF_WEIGHT_AUTOCORR * corrScore,
  ));

  return { genuineScore, logNormality, uniformity, serialCorrelation };
}
