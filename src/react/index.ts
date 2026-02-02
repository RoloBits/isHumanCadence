import { useRef, useState, useCallback, useEffect } from 'react';
import { createCadence } from '../index';
import type { CadenceConfig, CadenceResult, MetricScores } from '../types';

export interface UseHumanCadenceOptions {
  /** Sliding window size. Default: 50 */
  windowSize?: number;
  /** Minimum samples for confident score. Default: 20 */
  minSamples?: number;
  /** Custom metric weights. */
  weights?: CadenceConfig['weights'];
}

export interface UseHumanCadenceReturn {
  /** Callback ref — attach to any input, textarea, or contenteditable element. */
  ref: (node: HTMLElement | null) => void;
  /** Current humanity score (0.0–1.0). */
  score: number;
  /** True when enough samples have been collected. */
  confident: boolean;
  /** Individual metric scores. */
  metrics: MetricScores;
  /** Reset all collected data. */
  reset: () => void;
}

/**
 * React hook that wraps createCadence with idiomatic ref + state management.
 * Attach the returned `ref` to any element that receives keyboard input.
 */
export function useHumanCadence(
  options?: UseHumanCadenceOptions,
): UseHumanCadenceReturn {
  const cadenceRef = useRef<ReturnType<typeof createCadence> | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const [result, setResult] = useState<CadenceResult>({
    score: 0.5,
    metrics: {
      dwellVariance: 0.5,
      flightFit: 0.5,
      timingEntropy: 0.5,
      correctionRatio: 0.5,
      burstRegularity: 0.5,
    },
    sampleCount: 0,
    confident: false,
  });

  // Stable config ref to avoid re-creating cadence on every render
  const configRef = useRef(options);
  configRef.current = options;

  const ref = useCallback((node: HTMLElement | null) => {
    // Cleanup previous instance
    if (cadenceRef.current) {
      cadenceRef.current.destroy();
      cadenceRef.current = null;
    }

    nodeRef.current = node;

    if (node) {
      const opts = configRef.current;
      cadenceRef.current = createCadence(node, {
        windowSize: opts?.windowSize,
        minSamples: opts?.minSamples,
        weights: opts?.weights,
        scheduling: 'idle',
        onScore: setResult,
      });
      cadenceRef.current.start();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cadenceRef.current) {
        cadenceRef.current.destroy();
        cadenceRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    cadenceRef.current?.reset();
    setResult({
      score: 0.5,
      metrics: {
        dwellVariance: 0.5,
        flightFit: 0.5,
        timingEntropy: 0.5,
        correctionRatio: 0.5,
        burstRegularity: 0.5,
      },
      sampleCount: 0,
      confident: false,
    });
  }, []);

  return {
    ref,
    score: result.score,
    confident: result.confident,
    metrics: result.metrics,
    reset,
  };
}
