export interface MetricWeights {
  dwellVariance: number;
  flightFit: number;
  timingEntropy: number;
  correctionRatio: number;
  burstRegularity: number;
}

export interface MetricScores {
  dwellVariance: number;
  flightFit: number;
  timingEntropy: number;
  correctionRatio: number;
  burstRegularity: number;
}

export interface CadenceResult {
  /** Overall humanity score, 0.0 (bot) to 1.0 (human) */
  score: number;
  /** Individual metric scores, each 0.0–1.0 */
  metrics: MetricScores;
  /** Number of samples in current window */
  sampleCount: number;
  /** True when sampleCount >= minSamples */
  confident: boolean;
}

export interface CadenceConfig {
  /** Number of keystrokes in sliding window. Default: 50 */
  windowSize?: number;
  /** Minimum samples before producing a confident score. Default: 20 */
  minSamples?: number;
  /** Custom metric weights. Default: see DEFAULT_WEIGHTS */
  weights?: Partial<MetricWeights>;
  /** Called when a new score is computed */
  onScore?: (result: CadenceResult) => void;
  /** Analysis scheduling: 'idle' uses requestIdleCallback, 'manual' requires explicit analyze() calls. Default: 'idle' */
  scheduling?: 'idle' | 'manual';
}

export interface Cadence {
  /** Start listening for keyboard events */
  start(): void;
  /** Stop listening (preserves buffer) */
  stop(): void;
  /** Force immediate score computation */
  analyze(): CadenceResult;
  /** Reset buffer and all state */
  reset(): void;
  /** Stop listening and release all resources */
  destroy(): void;
}

/** Internal: raw timing data passed from observer to analyzer */
export interface TimingData {
  dwells: number[];
  flights: number[];
  corrections: number;
  total: number;
}
