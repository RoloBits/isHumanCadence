import { describe, it, expect } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../src/analyzer';
import { createBuffer } from '../src/buffer';
import { generateConstantBot, generateRandomJitterBot, generateGaussianBot } from './fixtures/bot-profiles';
import { generateHumanLike } from './fixtures/human-profiles';

function fillBuffer(values: number[]) {
  const buf = createBuffer(values.length + 10);
  for (const v of values) buf.push(v);
  return buf;
}

const defaultConfig = { minSamples: 20, weights: DEFAULT_WEIGHTS };

describe('createAnalyzer', () => {
  it('returns confident: false when below minSamples', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(10);
    const result = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );
    expect(result.confident).toBe(false);
    expect(result.sampleCount).toBe(10);
  });

  it('returns confident: true when at minSamples', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(20);
    const result = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );
    expect(result.confident).toBe(true);
    expect(result.sampleCount).toBe(20);
  });

  it('scores human-like data above 0.5', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(80);
    const result = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.confident).toBe(true);
  });

  it('scores constant bot data low', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const bot = generateConstantBot(50);
    const result = analyzer.analyze(
      fillBuffer(bot.dwells),
      fillBuffer(bot.flights),
      bot.corrections,
      bot.total,
    );
    expect(result.score).toBeLessThan(0.4);
  });

  it('scores human higher than constant bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );

    const bot = generateConstantBot(80);
    const botResult = analyzer.analyze(
      fillBuffer(bot.dwells),
      fillBuffer(bot.flights),
      bot.corrections,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('scores human higher than random-jitter bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );

    const bot = generateRandomJitterBot(80);
    const botResult = analyzer.analyze(
      fillBuffer(bot.dwells),
      fillBuffer(bot.flights),
      bot.corrections,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('scores human higher than gaussian bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );

    const bot = generateGaussianBot(80);
    const botResult = analyzer.analyze(
      fillBuffer(bot.dwells),
      fillBuffer(bot.flights),
      bot.corrections,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('returns all metric scores between 0 and 1', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(80);
    const result = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );

    for (const [, value] of Object.entries(result.metrics)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('overall score stays within [0, 1]', () => {
    const analyzer = createAnalyzer(defaultConfig);

    // Test with various profiles
    for (const data of [
      generateHumanLike(80),
      generateConstantBot(50),
      generateRandomJitterBot(80),
      generateGaussianBot(80),
    ]) {
      const result = analyzer.analyze(
        fillBuffer(data.dwells),
        fillBuffer(data.flights),
        data.corrections,
        data.total,
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  it('returns neutral 0.5 for dwellVariance when n < 5', () => {
    const analyzer = createAnalyzer(defaultConfig);
    // Only 3 dwell samples — below the n≥5 threshold
    const result = analyzer.analyze(
      fillBuffer([48, 46, 50]),
      fillBuffer([]),
      0,
      3,
    );
    expect(result.metrics.dwellVariance).toBe(0.5);
  });

  it('computes dwellVariance when n >= 5', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(10);
    const result = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );
    // With 10 samples (≥5), dwellVariance should be computed (not neutral 0.5)
    expect(result.metrics.dwellVariance).not.toBe(0.5);
  });

  it('zero corrections scores neutral regardless of sample size', () => {
    const corrOnlyWeights = {
      dwellVariance: 0, flightFit: 0, timingEntropy: 0,
      correctionRatio: 1.0, burstRegularity: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 5, weights: corrOnlyWeights });

    // Short input
    const short = analyzer.analyze(
      fillBuffer(new Array(10).fill(50)),
      fillBuffer(new Array(10).fill(100)), 0, 10,
    );
    expect(short.score).toBe(0.5);

    // Long input — still neutral
    const long = analyzer.analyze(
      fillBuffer(new Array(100).fill(50)),
      fillBuffer(new Array(100).fill(100)), 0, 100,
    );
    expect(long.score).toBe(0.5);
  });

  it('non-zero corrections score above neutral', () => {
    const corrOnlyWeights = {
      dwellVariance: 0, flightFit: 0, timingEntropy: 0,
      correctionRatio: 1.0, burstRegularity: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 5, weights: corrOnlyWeights });
    const result = analyzer.analyze(
      fillBuffer(new Array(50).fill(50)),
      fillBuffer(new Array(50).fill(100)), 3, 50,
    );
    expect(result.score).toBeGreaterThan(0.9);
  });

  it('respects custom weights', () => {
    // Weight only correction ratio — human has corrections, bot does not
    const corrOnlyWeights = {
      dwellVariance: 0,
      flightFit: 0,
      timingEntropy: 0,
      correctionRatio: 1.0,
      burstRegularity: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 20, weights: corrOnlyWeights });

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      fillBuffer(human.dwells),
      fillBuffer(human.flights),
      human.corrections,
      human.total,
    );

    const bot = generateConstantBot(80);
    const botResult = analyzer.analyze(
      fillBuffer(bot.dwells),
      fillBuffer(bot.flights),
      bot.corrections,
      bot.total,
    );

    // Human has corrections → high score; bot has 0 corrections → low score
    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });
});
