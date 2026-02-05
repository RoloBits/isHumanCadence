import { ref, onMounted, onUnmounted, type Ref, type ObjectDirective } from 'vue';
import { createCadence } from '../index';
import type { CadenceConfig, CadenceResult, Classification, MetricScores, Cadence } from '../types';

export interface UseHumanCadenceOptions {
  /** Sliding window size. Default: 50 */
  windowSize?: number;
  /** Minimum samples for confident score. Default: 20 */
  minSamples?: number;
  /** Custom metric weights. */
  weights?: CadenceConfig['weights'];
  /** Custom thresholds for hysteresis classification. */
  classificationThresholds?: CadenceConfig['classificationThresholds'];
}

export interface UseHumanCadenceReturn {
  /** Template ref — bind to an input/textarea element. */
  target: Ref<HTMLElement | null>;
  /** Current humanity score (0.0–1.0). */
  score: Ref<number>;
  /** True when enough samples have been collected. */
  confident: Ref<boolean>;
  /** Individual metric scores. */
  metrics: Ref<MetricScores>;
  /** Classification with hysteresis: 'bot', 'unknown', or 'human'. */
  classification: Ref<Classification>;
  /** Reset all collected data. */
  reset: () => void;
}

const NEUTRAL_METRICS: MetricScores = {
  dwellVariance: 0.5,
  flightFit: 0.5,
  timingEntropy: 0.5,
  correctionRatio: 0.5,
  burstRegularity: 0.5,
  rolloverRate: 0.5,
};

/**
 * Vue Composition API composable for keystroke cadence analysis.
 * Bind the returned `target` ref to an element via `ref="target"`.
 */
export function useHumanCadence(
  options?: UseHumanCadenceOptions,
): UseHumanCadenceReturn {
  const target = ref<HTMLElement | null>(null);
  const score = ref(0.5);
  const confident = ref(false);
  const metrics = ref<MetricScores>({ ...NEUTRAL_METRICS });
  const classification = ref<Classification>('unknown');

  let cadence: Cadence | null = null;

  function onScore(result: CadenceResult) {
    score.value = result.score;
    confident.value = result.confident;
    metrics.value = result.metrics;
    classification.value = result.classification;
  }

  onMounted(() => {
    if (!target.value) return;
    cadence = createCadence(target.value, {
      windowSize: options?.windowSize,
      minSamples: options?.minSamples,
      weights: options?.weights,
      classificationThresholds: options?.classificationThresholds,
      scheduling: 'idle',
      onScore,
    });
    cadence.start();
  });

  onUnmounted(() => {
    if (cadence) {
      cadence.destroy();
      cadence = null;
    }
  });

  function reset() {
    cadence?.reset();
    score.value = 0.5;
    confident.value = false;
    metrics.value = { ...NEUTRAL_METRICS };
    classification.value = 'unknown';
  }

  return { target, score, confident, metrics, classification, reset };
}

/** Directive binding value: callback or config with callback. */
type DirectiveBinding = ((result: CadenceResult) => void) | {
  onScore: (result: CadenceResult) => void;
  windowSize?: number;
  minSamples?: number;
  weights?: CadenceConfig['weights'];
  classificationThresholds?: CadenceConfig['classificationThresholds'];
};

const instanceMap = new WeakMap<HTMLElement, Cadence>();

/**
 * Vue directive for keystroke cadence analysis.
 *
 * Usage:
 *   <input v-human-cadence="onCadenceUpdate" />
 *   <input v-human-cadence="{ onScore: handler, minSamples: 30 }" />
 */
export const vHumanCadence: ObjectDirective<HTMLElement, DirectiveBinding> = {
  mounted(el, binding) {
    const value = binding.value;
    const callback = typeof value === 'function' ? value : value.onScore;
    const config: CadenceConfig = {
      scheduling: 'idle',
      onScore: callback,
    };

    if (typeof value === 'object') {
      config.windowSize = value.windowSize;
      config.minSamples = value.minSamples;
      config.weights = value.weights;
      config.classificationThresholds = value.classificationThresholds;
    }

    const cadence = createCadence(el, config);
    cadence.start();
    instanceMap.set(el, cadence);
  },

  unmounted(el) {
    const cadence = instanceMap.get(el);
    if (cadence) {
      cadence.destroy();
      instanceMap.delete(el);
    }
  },
};
