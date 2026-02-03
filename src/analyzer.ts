import type { MetricScores, MetricWeights } from './types';
import type { RingBuffer } from './buffer';
import { stddev, shannonEntropy, sigmoid, clamp, mean } from './utils';
import { detectSpoof } from './anti-spoof';

export const DEFAULT_WEIGHTS: MetricWeights = {
  dwellVariance: 0.10,
  flightFit: 0.25,
  timingEntropy: 0.20,
  correctionRatio: 0.10,
  burstRegularity: 0.15,
  rolloverRate: 0.20,
};

/** Minimum dwell samples for variance scoring.
 *  With n<5, population stddev has ≤3 degrees of freedom —
 *  the 95% CI is [0.45σ̂, 31.9σ̂] at n=2, narrowing to [0.60σ̂, 2.87σ̂] at n=5. */
const MIN_DWELL_SAMPLES = 5;

/** Minimum flight samples for distribution fitting.
 *  The KS test requires ≥5 observations to reliably distinguish
 *  log-normal (human) from uniform (bot) distributions. */
const MIN_FLIGHT_SAMPLES = 5;

/** Minimum flight samples for entropy scoring.
 *  Shannon entropy over 10 bins needs ≥5 samples to avoid
 *  degenerate single-bin distributions that read as zero entropy. */
const MIN_ENTROPY_SAMPLES = 5;

/** Minimum total keystrokes for correction ratio scoring.
 *  With fewer than 5 keystrokes, the ratio corrections/total
 *  swings wildly (e.g. 1/3 = 33%) and is not indicative. */
const MIN_CORRECTION_SAMPLES = 5;

/** Minimum flight samples for burst regularity scoring.
 *  Burst detection needs enough inter-key flights to observe ≥2
 *  inter-burst gaps (threshold: 300ms), which typically requires ~10 flights. */
const MIN_BURST_SAMPLES = 10;

/** Minimum total keystrokes for rollover rate scoring.
 *  Rollover detection requires enough keystrokes to observe
 *  overlap patterns — fewer than 10 gives unreliable rates. */
const MIN_ROLLOVER_SAMPLES = 10;

/** Sentinel: metric has no behavioral data to score (e.g. 0 corrections). */
const NO_DATA = -1;

export interface AnalyzerResult {
  score: number;
  metrics: MetricScores;
  sampleCount: number;
  confident: boolean;
}

export interface AnalyzerConfig {
  minSamples: number;
  weights: MetricWeights;
}

export interface Analyzer {
  analyze(
    dwells: RingBuffer,
    flights: RingBuffer,
    corrections: number,
    rollovers: number,
    total: number,
  ): AnalyzerResult;
}

/**
 * Dwell variance score.
 * Humans: σ ≈ 15–60ms (high variability). Bots: σ < 5ms or σ > 100ms.
 * Sigmoid centered at 25ms, scoring human-range high.
 */
function scoreDwellVariance(dwells: number[]): number {
  if (dwells.length < MIN_DWELL_SAMPLES) return 0.5;
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
  if (flights.length < MIN_FLIGHT_SAMPLES) return 0.5;
  const result = detectSpoof(flights);

  // Physical IKI floor: sustained median < 60ms is impossible for humans
  let subFloor = 0;
  for (let i = 0; i < flights.length; i++) {
    if (flights[i] < 60) subFloor++;
  }
  const ikiPenalty = (subFloor / flights.length) > 0.5 ? 0.15 : 1.0;

  return result.genuineScore * ikiPenalty;
}

/**
 * Timing entropy score.
 * Humans: medium-high entropy (2.5–4.0 bits) — varied but not perfectly uniform.
 * Bots: very high (uniform) or very low (constant).
 * Bell-shaped scoring centered around 3.0 bits.
 */
function scoreTimingEntropy(flights: number[]): number {
  if (flights.length < MIN_ENTROPY_SAMPLES) return 0.5;
  const entropy = shannonEntropy(flights, 10);

  // Fluctuation ratio: max/min IKI distinguishes narrow-range bots from humans
  let min = flights[0], max = flights[0];
  for (let i = 1; i < flights.length; i++) {
    if (flights[i] < min) min = flights[i];
    if (flights[i] > max) max = flights[i];
  }
  const fluctuation = min > 0 ? max / min : 0;
  const fluctScore = sigmoid(fluctuation, 1.0, 4);

  // Base entropy (unchanged bell shape)
  const up = sigmoid(entropy, 3, 1.5);
  const down = sigmoid(entropy, -3, 3.5);
  const entropyScore = up * down;

  // Combine: 70% entropy + 30% fluctuation
  return 0.7 * entropyScore + 0.3 * fluctScore;
}

/**
 * Correction ratio score.
 * Corrections are a positive human signal — bots don't backspace.
 * Zero corrections → NO_DATA (gated out of weighted average).
 *
 * Aalto 136M study (Dhakal et al., CHI 2018): correction rates vary widely
 * (fast typists: 3.4% ± 2.05%, slow: 9.05% ± 6.85%). Zero corrections
 * over 50+ keystrokes is normal for ~50% of skilled typists.
 */
function scoreCorrectionRatio(corrections: number, total: number): number {
  if (total < MIN_CORRECTION_SAMPLES) return 0.5;
  if (corrections === 0) return NO_DATA;
  const ratio = corrections / total;
  const raw = sigmoid(ratio, 80, 0.015);
  const floor = sigmoid(0, 80, 0.015);
  const score = (raw - floor) / (1 - floor);
  // Excessive corrections (>30%) → slight penalty
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
  if (flights.length < MIN_BURST_SAMPLES) return 0.5;

  const BURST_THRESHOLD = 300;
  const burstGaps: number[] = [];

  for (let i = 0; i < flights.length; i++) {
    if (flights[i] > BURST_THRESHOLD) {
      burstGaps.push(flights[i]);
    }
  }

  // No bursts detected — no signal to score
  if (burstGaps.length < 2) return NO_DATA;

  const gapStddev = stddev(burstGaps);
  const gapMean = mean(burstGaps);

  // Coefficient of variation: high CV = irregular bursts = human
  const cv = gapMean > 0 ? gapStddev / gapMean : 0;
  return sigmoid(cv, 8, 0.2);
}

/**
 * Rollover rate score.
 * Rollover = pressing next key before releasing current key.
 * Dhakal et al.: r=0.73 with WPM (strongest single predictor).
 * Humans: 25% average, 50% for fast typists. Bots: 0%.
 * Zero rollovers → NO_DATA (gated out of weighted average).
 */
function scoreRolloverRate(rollovers: number, total: number): number {
  if (total < MIN_ROLLOVER_SAMPLES) return 0.5;
  if (rollovers === 0) return NO_DATA;
  const ratio = rollovers / total;
  const raw = sigmoid(ratio, 60, 0.03);
  const floor = sigmoid(0, 60, 0.03);
  return (raw - floor) / (1 - floor);
}

export function createAnalyzer(config: AnalyzerConfig): Analyzer {
  const { minSamples, weights } = config;

  return {
    analyze(
      dwellBuf: RingBuffer,
      flightBuf: RingBuffer,
      corrections: number,
      rollovers: number,
      total: number,
    ): AnalyzerResult {
      const dwells = dwellBuf.toArray();
      const flights = flightBuf.toArray();
      const sampleCount = dwells.length;
      const confident = sampleCount >= minSamples;

      const raw = {
        dwellVariance: scoreDwellVariance(dwells),
        flightFit: scoreFlightFit(flights),
        timingEntropy: scoreTimingEntropy(flights),
        correctionRatio: scoreCorrectionRatio(corrections, total),
        burstRegularity: scoreBurstRegularity(flights),
        rolloverRate: scoreRolloverRate(rollovers, total),
      };

      // Public metrics: replace NO_DATA with 0 for reporting
      const metrics: MetricScores = {
        dwellVariance: raw.dwellVariance === NO_DATA ? 0 : raw.dwellVariance,
        flightFit: raw.flightFit === NO_DATA ? 0 : raw.flightFit,
        timingEntropy: raw.timingEntropy === NO_DATA ? 0 : raw.timingEntropy,
        correctionRatio: raw.correctionRatio === NO_DATA ? 0 : raw.correctionRatio,
        burstRegularity: raw.burstRegularity === NO_DATA ? 0 : raw.burstRegularity,
        rolloverRate: raw.rolloverRate === NO_DATA ? 0 : raw.rolloverRate,
      };

      // Dynamic weight redistribution: skip gated (NO_DATA) metrics
      let weightedSum = 0;
      let weightSum = 0;
      const keys: (keyof MetricWeights)[] = [
        'dwellVariance', 'flightFit', 'timingEntropy',
        'correctionRatio', 'burstRegularity', 'rolloverRate',
      ];
      for (const k of keys) {
        if (raw[k] !== NO_DATA) {
          weightedSum += weights[k] * raw[k];
          weightSum += weights[k];
        }
      }

      const score = weightSum > 0 ? clamp(weightedSum / weightSum, 0, 1) : 0;

      return { score, metrics, sampleCount, confident };
    },
  };
}
