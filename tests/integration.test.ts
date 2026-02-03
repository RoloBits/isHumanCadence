import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCadence } from '../src/index';
import type { CadenceResult } from '../src/types';

function fireKey(target: EventTarget, type: 'keydown' | 'keyup', key: string = 'a', opts?: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, ...opts }));
}

/**
 * Simulate a full keystroke sequence on a target.
 * Each entry in `timings` is [dwellMs, flightMs].
 * Uses mocked performance.now() to control timestamps.
 */
function typeSequence(
  target: EventTarget,
  timings: [number, number][],
  startTime: number,
  mockNow: { value: number },
) {
  let t = startTime;
  for (let i = 0; i < timings.length; i++) {
    const [dwell, flight] = timings[i];

    // Flight gap (skip for first keystroke)
    if (i > 0) t += flight;

    // Keydown
    mockNow.value = t;
    fireKey(target, 'keydown');

    // Keyup
    t += dwell;
    mockNow.value = t;
    fireKey(target, 'keyup');
  }
}

/** Generate human-like timing pairs: log-normal-ish, with variance */
function humanTimings(count: number, seed: number = 99): [number, number][] {
  // Seeded PRNG (xorshift32)
  let s = seed | 0;
  const rng = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const normal = () => {
    const u1 = rng(), u2 = rng();
    return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  };

  const timings: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const dwell = Math.max(15, Math.exp(3.5 + 0.4 * normal()));
    const flight = Math.max(20, Math.exp(4.5 + 0.6 * normal()));
    timings.push([dwell, flight]);
  }
  return timings;
}

/** Generate constant bot timing pairs */
function botTimings(count: number): [number, number][] {
  return Array.from({ length: count }, () => [50, 100] as [number, number]);
}

describe('createCadence integration', () => {
  let target: EventTarget;
  let mockNow: { value: number };

  beforeEach(() => {
    target = new EventTarget();
    mockNow = { value: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => mockNow.value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default neutral result before any input', () => {
    const cadence = createCadence(target, { scheduling: 'manual' });
    cadence.start();
    const result = cadence.analyze();
    expect(result.score).toBe(0.5);
    expect(result.confident).toBe(false);
    expect(result.sampleCount).toBe(0);
    cadence.destroy();
  });

  it('scores human-like typing above 0.5 with confidence', () => {
    const cadence = createCadence(target, { scheduling: 'manual', minSamples: 20 });
    cadence.start();

    const timings = humanTimings(50);
    typeSequence(target, timings, 1000, mockNow);

    // Also add some corrections
    mockNow.value += 200;
    fireKey(target, 'keydown', 'Backspace');
    mockNow.value += 40;
    fireKey(target, 'keyup', 'Backspace');

    const result = cadence.analyze();
    expect(result.confident).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.sampleCount).toBeGreaterThan(20);
    cadence.destroy();
  });

  it('scores constant bot typing lower than human', () => {
    const cadence = createCadence(target, { scheduling: 'manual' });
    cadence.start();

    // Bot sequence
    const bTimings = botTimings(50);
    typeSequence(target, bTimings, 1000, mockNow);
    const botResult = cadence.analyze();

    cadence.destroy();

    // Human sequence on fresh instance
    const cadence2 = createCadence(target, { scheduling: 'manual' });
    cadence2.start();

    const hTimings = humanTimings(50);
    typeSequence(target, hTimings, 1000, mockNow);
    mockNow.value += 200;
    fireKey(target, 'keydown', 'Backspace');
    mockNow.value += 35;
    fireKey(target, 'keyup', 'Backspace');

    const humanResult = cadence2.analyze();
    cadence2.destroy();

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('confident flips from false to true at minSamples', () => {
    const cadence = createCadence(target, { scheduling: 'manual', minSamples: 10 });
    cadence.start();

    const timings = humanTimings(15);

    // Type 9 keys — should not be confident
    typeSequence(target, timings.slice(0, 9), 1000, mockNow);
    expect(cadence.analyze().confident).toBe(false);

    // Type 1 more — should now be confident (10 dwells)
    typeSequence(target, timings.slice(9, 11), mockNow.value + 100, mockNow);
    expect(cadence.analyze().confident).toBe(true);

    cadence.destroy();
  });

  it('reset() clears all state', () => {
    const cadence = createCadence(target, { scheduling: 'manual' });
    cadence.start();

    typeSequence(target, humanTimings(30), 1000, mockNow);
    expect(cadence.analyze().sampleCount).toBeGreaterThan(0);

    cadence.reset();
    const result = cadence.analyze();
    expect(result.sampleCount).toBe(0);
    expect(result.confident).toBe(false);
    expect(result.score).toBe(0.5);

    cadence.destroy();
  });

  it('stop() halts capture but preserves state', () => {
    const cadence = createCadence(target, { scheduling: 'manual' });
    cadence.start();

    typeSequence(target, humanTimings(20), 1000, mockNow);
    cadence.stop();

    const countBefore = cadence.analyze().sampleCount;

    // More events after stop — should be ignored
    typeSequence(target, humanTimings(10, 555), mockNow.value + 200, mockNow);
    const countAfter = cadence.analyze().sampleCount;

    expect(countAfter).toBe(countBefore);
    cadence.destroy();
  });

  it('onScore callback fires on analyze()', () => {
    const callback = vi.fn();
    const cadence = createCadence(target, { scheduling: 'manual', onScore: callback as (result: CadenceResult) => void });
    cadence.start();

    typeSequence(target, humanTimings(25), 1000, mockNow);
    cadence.analyze();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toHaveProperty('score');
    expect(callback.mock.calls[0][0]).toHaveProperty('confident');

    cadence.destroy();
  });

  it('destroy() stops everything and clears state', () => {
    const cadence = createCadence(target, { scheduling: 'manual' });
    cadence.start();

    typeSequence(target, humanTimings(20), 1000, mockNow);
    cadence.destroy();

    // After destroy, analyze returns neutral defaults
    const result = cadence.analyze();
    expect(result.sampleCount).toBe(0);
    expect(result.score).toBe(0.5);
  });

  it('Cmd+C mid-typing does not degrade human score', () => {
    const cadence = createCadence(target, { scheduling: 'manual', minSamples: 20 });
    cadence.start();

    const timings = humanTimings(50);

    // Type first 25 keys
    typeSequence(target, timings.slice(0, 25), 1000, mockNow);
    const scoreBefore = cadence.analyze().score;

    // Cmd+C shortcut (should be fully filtered)
    mockNow.value += 300;
    fireKey(target, 'keydown', 'Meta', { metaKey: true });
    mockNow.value += 20;
    fireKey(target, 'keydown', 'c', { metaKey: true });
    mockNow.value += 30;
    fireKey(target, 'keyup', 'c', { metaKey: true });
    mockNow.value += 20;
    fireKey(target, 'keyup', 'Meta');

    // Type remaining 25 keys
    typeSequence(target, timings.slice(25), mockNow.value + 100, mockNow);

    // Add some corrections for realism
    mockNow.value += 200;
    fireKey(target, 'keydown', 'Backspace');
    mockNow.value += 40;
    fireKey(target, 'keyup', 'Backspace');

    const scoreAfter = cadence.analyze().score;

    // Score should not drop significantly due to the shortcut
    expect(scoreAfter).toBeGreaterThan(0.5);
    expect(scoreAfter).toBeGreaterThan(scoreBefore - 0.1);

    cadence.destroy();
  });

  it('works with custom weights', () => {
    // Heavy weight on correction ratio
    const cadence = createCadence(target, {
      scheduling: 'manual',
      weights: { correctionRatio: 1.0, dwellVariance: 0, flightFit: 0, timingEntropy: 0, burstRegularity: 0 },
    });
    cadence.start();

    // Type with corrections
    typeSequence(target, humanTimings(30), 1000, mockNow);
    for (let i = 0; i < 5; i++) {
      mockNow.value += 150;
      fireKey(target, 'keydown', 'Backspace');
      mockNow.value += 40;
      fireKey(target, 'keyup', 'Backspace');
    }

    const result = cadence.analyze();
    // Score should be driven primarily by correction ratio
    expect(result.metrics.correctionRatio).toBeGreaterThan(0.5);

    cadence.destroy();
  });
});
