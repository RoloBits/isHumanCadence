import type { Cadence, CadenceConfig, CadenceResult } from './types';
import { createObserver } from './observer';
import { createAnalyzer, DEFAULT_WEIGHTS } from './analyzer';

export type { Cadence, CadenceConfig, CadenceResult, CadenceSignals, MetricWeights, MetricScores, TimingData } from './types';
export { DEFAULT_WEIGHTS } from './analyzer';

const DEFAULT_WINDOW_SIZE = 50;
const DEFAULT_MIN_SAMPLES = 20;
const IDLE_TIMEOUT = 1000;
const FALLBACK_DELAY = 100;

/**
 * Create a keystroke cadence analyzer attached to a DOM element.
 * Returns controls to start/stop listening and retrieve humanity scores.
 */
export function createCadence(
  target: EventTarget,
  config?: CadenceConfig,
): Cadence {
  const windowSize = config?.windowSize ?? DEFAULT_WINDOW_SIZE;
  const minSamples = config?.minSamples ?? DEFAULT_MIN_SAMPLES;
  const scheduling = config?.scheduling ?? 'idle';
  const onScore = config?.onScore;

  const weights = { ...DEFAULT_WEIGHTS, ...config?.weights };
  const observer = createObserver(target, { windowSize });
  const analyzer = createAnalyzer({ minSamples, weights });

  let dirty = false;
  let idleHandle: number | undefined;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let lastResult: CadenceResult = {
    score: 0.5,
    metrics: {
      dwellVariance: 0.5,
      flightFit: 0.5,
      timingEntropy: 0.5,
      correctionRatio: 0.5,
      burstRegularity: 0.5,
      rolloverRate: 0.5,
    },
    sampleCount: 0,
    confident: false,
    signals: {
      pasteDetected: false,
      syntheticEvents: 0,
      insufficientData: true,
      inputWithoutKeystrokes: false,
      inputWithoutKeystrokeCount: 0,
    },
  };

  function computeScore() {
    const state = observer.getState();
    const base = analyzer.analyze(
      state.dwells,
      state.flights,
      state.corrections,
      state.rollovers,
      state.total,
    );
    lastResult = {
      ...base,
      signals: {
        pasteDetected: state.pasteDetected,
        syntheticEvents: state.syntheticEvents,
        insufficientData: base.sampleCount < minSamples,
        inputWithoutKeystrokes: state.inputWithoutKeystrokes,
        inputWithoutKeystrokeCount: state.inputWithoutKeystrokeCount,
      },
    };
    dirty = false;
    onScore?.(lastResult);
  }

  function scheduleAnalysis() {
    if (!dirty) return;

    if (typeof requestIdleCallback !== 'undefined') {
      if (idleHandle !== undefined) cancelIdleCallback(idleHandle);
      idleHandle = requestIdleCallback(() => {
        idleHandle = undefined;
        computeScore();
      }, { timeout: IDLE_TIMEOUT });
    } else {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        timeoutHandle = undefined;
        computeScore();
      }, FALLBACK_DELAY);
    }
  }

  // Wrap observer to hook into keystroke events for scheduling
  const originalStart = observer.start.bind(observer);
  const originalStop = observer.stop.bind(observer);

  function onKeystroke() {
    dirty = true;
    if (scheduling === 'idle') scheduleAnalysis();
  }

  let keystrokeListener: (() => void) | null = null;

  function start() {
    originalStart();
    if (!keystrokeListener) {
      keystrokeListener = onKeystroke;
      target.addEventListener('keyup', keystrokeListener, { passive: true });
    }
  }

  function stop() {
    originalStop();
    if (keystrokeListener) {
      target.removeEventListener('keyup', keystrokeListener);
      keystrokeListener = null;
    }
  }

  function analyze(): CadenceResult {
    computeScore();
    return lastResult;
  }

  function reset() {
    observer.clear();
    dirty = false;
    if (idleHandle !== undefined) { cancelIdleCallback(idleHandle); idleHandle = undefined; }
    if (timeoutHandle !== undefined) { clearTimeout(timeoutHandle); timeoutHandle = undefined; }
    lastResult = {
      score: 0.5,
      metrics: {
        dwellVariance: 0.5,
        flightFit: 0.5,
        timingEntropy: 0.5,
        correctionRatio: 0.5,
        burstRegularity: 0.5,
        rolloverRate: 0.5,
      },
      sampleCount: 0,
      confident: false,
      signals: {
        pasteDetected: false,
        syntheticEvents: 0,
        insufficientData: true,
        inputWithoutKeystrokes: false,
        inputWithoutKeystrokeCount: 0,
      },
    };
  }

  function destroy() {
    stop();
    reset();
  }

  return { start, stop, analyze, reset, destroy };
}
