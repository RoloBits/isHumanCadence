import { normalCDF, autocorrelation, mean, stddev } from './utils';

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
  if (flights.length < 5) return 0.5; // insufficient data, neutral

  // Log-transform, filtering out non-positive values
  const logged: number[] = [];
  for (let i = 0; i < flights.length; i++) {
    if (flights[i] > 0) logged.push(Math.log(flights[i]));
  }
  if (logged.length < 5) return 0.5;

  const mu = mean(logged);
  const sigma = stddev(logged);
  if (sigma === 0) return 0; // constant values → not human

  // KS test against normal(mu, sigma)
  const D = ksStatistic([...logged], (x) => normalCDF((x - mu) / sigma));

  // Critical value at alpha=0.05: 1.36 / sqrt(n)
  const critical = 1.36 / Math.sqrt(logged.length);

  // Convert D to a score: D < critical → good fit → high score
  // Use ratio: score approaches 1 as D approaches 0
  if (D <= critical) {
    return 0.7 + 0.3 * (1 - D / critical);
  }
  // D > critical: score drops below 0.7
  return Math.max(0, 0.7 * (critical / D));
}

/**
 * Test how well flight times fit a uniform distribution.
 * Returns a score 0–1 where higher = better fit to uniform = more bot-like.
 */
export function computeUniformityScore(flights: number[]): number {
  if (flights.length < 5) return 0.5;

  const sorted = [...flights].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  if (range === 0) return 0; // constant is not uniform, it's degenerate

  // KS test against uniform(min, max)
  const D = ksStatistic([...sorted], (x) => (x - min) / range);
  const critical = 1.36 / Math.sqrt(flights.length);

  if (D <= critical) {
    return 0.7 + 0.3 * (1 - D / critical);
  }
  return Math.max(0, 0.7 * (critical / D));
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
  const corrScore = absCorr > 0.05 ? Math.min(1, absCorr / 0.3) : 0;

  // Weighted combination
  const genuineScore = Math.max(0, Math.min(1,
    0.45 * logNormality +
    0.30 * (1 - uniformity) +
    0.25 * corrScore,
  ));

  return { genuineScore, logNormality, uniformity, serialCorrelation };
}
