import { describe, it, expect } from 'vitest';
import {
  mean,
  stddev,
  clamp,
  normalCDF,
  shannonEntropy,
  autocorrelation,
  sigmoid,
} from '../src/utils';

describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the value for single element', () => {
    expect(mean([42])).toBe(42);
  });

  it('computes arithmetic mean', () => {
    expect(mean([10, 20, 30])).toBe(20);
  });

  it('handles negative values', () => {
    expect(mean([-10, 10])).toBe(0);
  });
});

describe('stddev', () => {
  it('returns 0 for empty array', () => {
    expect(stddev([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(stddev([5])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(stddev([7, 7, 7, 7])).toBe(0);
  });

  it('computes population standard deviation', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stddev=2
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles min === max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('normalCDF', () => {
  it('returns ~0.5 at x=0', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 5);
  });

  it('returns ~0.8413 at x=1 (one sigma)', () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
  });

  it('returns ~0.1587 at x=-1', () => {
    expect(normalCDF(-1)).toBeCloseTo(0.1587, 3);
  });

  it('returns ~0.9772 at x=2', () => {
    expect(normalCDF(2)).toBeCloseTo(0.9772, 3);
  });

  it('approaches 1.0 for large positive x', () => {
    expect(normalCDF(5)).toBeGreaterThan(0.999);
  });

  it('approaches 0.0 for large negative x', () => {
    expect(normalCDF(-5)).toBeLessThan(0.001);
  });
});

describe('shannonEntropy', () => {
  it('returns 0 for empty array', () => {
    expect(shannonEntropy([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(shannonEntropy([5])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(shannonEntropy([3, 3, 3, 3])).toBe(0);
  });

  it('returns high entropy for uniformly spread values', () => {
    // Values spread across all bins should give high entropy
    const uniform = Array.from({ length: 100 }, (_, i) => i);
    const entropy = shannonEntropy(uniform, 10);
    // Max entropy for 10 bins = log2(10) ≈ 3.32
    expect(entropy).toBeGreaterThan(3.0);
  });

  it('returns low entropy for clustered values', () => {
    // Most values in one cluster
    const clustered = [
      ...Array(90).fill(50),
      ...Array(10).fill(100),
    ];
    const entropy = shannonEntropy(clustered, 10);
    expect(entropy).toBeLessThan(1.5);
  });
});

describe('autocorrelation', () => {
  it('returns 0 for fewer than 3 values', () => {
    expect(autocorrelation([])).toBe(0);
    expect(autocorrelation([1])).toBe(0);
    expect(autocorrelation([1, 2])).toBe(0);
  });

  it('returns high positive value for correlated series', () => {
    // Slowly increasing → strong positive autocorrelation
    const series = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(autocorrelation(series)).toBeGreaterThan(0.5);
  });

  it('returns near-zero for random-like alternating values', () => {
    // Alternating high/low → negative autocorrelation
    const alternating = [1, 100, 1, 100, 1, 100, 1, 100];
    expect(autocorrelation(alternating)).toBeLessThan(0);
  });

  it('returns 0 for constant values', () => {
    expect(autocorrelation([5, 5, 5, 5, 5])).toBe(0);
  });
});

describe('sigmoid', () => {
  it('returns 0.5 at the midpoint', () => {
    expect(sigmoid(5, 1, 5)).toBeCloseTo(0.5, 5);
  });

  it('returns > 0.5 above midpoint', () => {
    expect(sigmoid(10, 1, 5)).toBeGreaterThan(0.5);
  });

  it('returns < 0.5 below midpoint', () => {
    expect(sigmoid(0, 1, 5)).toBeLessThan(0.5);
  });

  it('steepness k controls the slope', () => {
    const gentle = sigmoid(6, 0.5, 5);
    const steep = sigmoid(6, 5, 5);
    // Steeper k pushes value closer to 1 for same distance from midpoint
    expect(steep).toBeGreaterThan(gentle);
  });

  it('returns values in (0, 1) for moderate inputs', () => {
    expect(sigmoid(-5, 1, 0)).toBeGreaterThan(0);
    expect(sigmoid(-5, 1, 0)).toBeLessThan(0.5);
    expect(sigmoid(5, 1, 0)).toBeGreaterThan(0.5);
    expect(sigmoid(5, 1, 0)).toBeLessThan(1);
  });
});
