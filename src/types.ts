export interface MetricWeights {
  dwellVariance: number;
  flightFit: number;
  timingEntropy: number;
  correctionRatio: number;
  burstRegularity: number;
  rolloverRate: number;
}

export interface MetricScores {
  dwellVariance: number;
  flightFit: number;
  timingEntropy: number;
  correctionRatio: number;
  burstRegularity: number;
  rolloverRate: number;
}

export interface CadenceSignals {
  /** True when a paste event was detected */
  pasteDetected: boolean;
  /** Number of programmatic (non-user-initiated) events seen */
  syntheticEvents: number;
  /** True when sampleCount < minSamples — not enough data to judge */
  insufficientData: boolean;
  /** True when text entered the field via a non-keyboard method (dictation, autofill, etc.) */
  inputWithoutKeystrokes: boolean;
  /** Number of input events that occurred without a preceding keystroke (autocomplete, dictation, etc.) */
  inputWithoutKeystrokeCount: number;
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
  /** Contextual signals to help distinguish bots from assistive tech */
  signals: CadenceSignals;
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
  /** Record per-keystroke event log for offline analysis. Default: false */
  recordEvents?: boolean;
}

export interface Cadence {
  /** Start listening for keyboard events */
  start(): void;
  /** Stop listening (preserves buffer) */
  stop(): void;
  /** Force immediate score computation */
  analyze(): CadenceResult;
  /** Clear all data and reset score (does not stop listening) */
  reset(): void;
  /** Return a plain-object copy of the current raw timing buffers */
  snapshot(): TimingData;
  /** Stop listening and release all resources */
  destroy(): void;
}

/** A single keystroke's raw timing data (relative to session start). */
export interface KeystrokeEvent {
  /** Timestamp of keydown (ms, from performance.now()) */
  pressTime: number;
  /** Timestamp of keyup (ms, from performance.now()) */
  releaseTime: number;
  /** True if this was a Backspace/Delete */
  isCorrection: boolean;
  /** True if another key was still held when this key was pressed */
  isRollover: boolean;
}

/** Raw timing data collected by the observer */
export interface TimingData {
  dwells: number[];
  flights: number[];
  corrections: number;
  rollovers: number;
  total: number;
  /** Per-keystroke event log (present when recordEvents was enabled) */
  events?: KeystrokeEvent[];
}
