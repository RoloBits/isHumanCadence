import type { CadenceResult, MetricWeights } from './types';
import type { RingBuffer } from './buffer';
import { stddev, shannonEntropy, sigmoid, clamp, mean } from './utils';
import { detectSpoof } from './anti-spoof';

export const DEFAULT_WEIGHTS: MetricWeights = {
  dwellVariance: 0.15,
  flightFit: 0.30,
  timingEntropy: 0.20,
  correctionRatio: 0.15,
  burstRegularity: 0.20,
};

export interface AnalyzerConfig {
  minSamples: number;
  weights: MetricWeights;
}

export interface Analyzer {
  analyze(
    dwells: RingBuffer,
    flights: RingBuffer,
    corrections: number,
    total: number,
  ): CadenceResult;
}

/**
 * Dwell variance score.
 * Humans: σ ≈ 15–60ms (high variability). Bots: σ < 5ms or σ > 100ms.
 * Sigmoid centered at 25ms, scoring human-range high.
 */
function scoreDwellVariance(dwells: number[]): number {
  if (dwells.length < 2) return 0.5;
  const sd = stddev(dwells);
  // Too low (< 5ms) → bot, sweet spot ~15–60ms → human, too high → noise
  // Use a bell-like shape: sigmoid up then sigmoid down
  const up = sigmoid(sd, 0.3, 8);    // ramps up around 8ms
  const down = sigmoid(sd, -0.05, 80); // ramps down around 80ms
  return up * down;
}

/**
 * Flight fit score.
 * Delegates to anti-spoof detectSpoof for distribution analysis.
 * Returns the genuineScore directly.
 */
function scoreFlightFit(flights: number[]): number {
  if (flights.length < 5) return 0.5;
  const result = detectSpoof(flights);
  return result.genuineScore;
}

/**
 * Timing entropy score.
 * Humans: medium-high entropy (2.5–4.0 bits) — varied but not perfectly uniform.
 * Bots: very high (uniform) or very low (constant).
 * Bell-shaped scoring centered around 3.0 bits.
 */
function scoreTimingEntropy(flights: number[]): number {
  if (flights.length < 5) return 0.5;
  const entropy = shannonEntropy(flights, 10);
  // Sweet spot is ~2.0–3.5 bits
  const up = sigmoid(entropy, 3, 1.5);   // ramps up around 1.5 bits
  const down = sigmoid(entropy, -3, 3.5); // ramps down around 3.5 bits
  return up * down;
}

/**
 * Correction ratio score.
 * Humans: 2–15% correction rate. Bots: 0% (never correct) or exact value.
 */
function scoreCorrectionRatio(corrections: number, total: number): number {
  if (total < 5) return 0.5;
  const ratio = corrections / total;
  // 0% → likely bot, 2–15% → human, >20% → either human or noise
  // Sigmoid ramps up: having *some* corrections is very human
  const score = sigmoid(ratio, 80, 0.015);
  // Slight penalty for impossibly high correction rates (>30%)
  return ratio > 0.3 ? score * 0.8 : score;
}

/**
 * Burst regularity score.
 * Humans type in bursts with irregular gaps between them.
 * Bots produce suspiciously regular inter-burst timing.
 *
 * Detect bursts: a gap > 300ms separates bursts.
 * Then measure σ of burst gaps — high σ = human.
 */
function scoreBurstRegularity(flights: number[]): number {
  if (flights.length < 10) return 0.5;

  const BURST_THRESHOLD = 300;
  const burstGaps: number[] = [];

  for (let i = 0; i < flights.length; i++) {
    if (flights[i] > BURST_THRESHOLD) {
      burstGaps.push(flights[i]);
    }
  }

  // No bursts detected — could be one continuous stream (neutral)
  if (burstGaps.length < 2) return 0.5;

  const gapStddev = stddev(burstGaps);
  const gapMean = mean(burstGaps);

  // Coefficient of variation: high CV = irregular bursts = human
  const cv = gapMean > 0 ? gapStddev / gapMean : 0;
  return sigmoid(cv, 8, 0.2);
}

export function createAnalyzer(config: AnalyzerConfig): Analyzer {
  const { minSamples, weights } = config;

  return {
    analyze(
      dwellBuf: RingBuffer,
      flightBuf: RingBuffer,
      corrections: number,
      total: number,
    ): CadenceResult {
      const dwells = dwellBuf.toArray();
      const flights = flightBuf.toArray();
      const sampleCount = dwells.length;
      const confident = sampleCount >= minSamples;

      const metrics = {
        dwellVariance: scoreDwellVariance(dwells),
        flightFit: scoreFlightFit(flights),
        timingEntropy: scoreTimingEntropy(flights),
        correctionRatio: scoreCorrectionRatio(corrections, total),
        burstRegularity: scoreBurstRegularity(flights),
      };

      const score = clamp(
        weights.dwellVariance * metrics.dwellVariance +
        weights.flightFit * metrics.flightFit +
        weights.timingEntropy * metrics.timingEntropy +
        weights.correctionRatio * metrics.correctionRatio +
        weights.burstRegularity * metrics.burstRegularity,
        0,
        1,
      );

      return { score, metrics, sampleCount, confident };
    },
  };
}
