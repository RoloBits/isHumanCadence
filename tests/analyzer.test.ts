import { describe, it, expect } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../src/analyzer';
import { generateConstantBot, generateRandomJitterBot, generateGaussianBot } from './fixtures/bot-profiles';
import { generateHumanLike } from './fixtures/human-profiles';

const defaultConfig = { minSamples: 20, weights: DEFAULT_WEIGHTS };

describe('createAnalyzer', () => {
  it('returns confident: false when below minSamples', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(10);
    const result = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );
    expect(result.confident).toBe(false);
    expect(result.sampleCount).toBe(10);
  });

  it('returns confident: true when at minSamples', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(20);
    const result = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );
    expect(result.confident).toBe(true);
    expect(result.sampleCount).toBe(20);
  });

  it('scores human-like data above 0.5', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(80);
    const result = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.confident).toBe(true);
  });

  it('scores constant bot data low', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const bot = generateConstantBot(50);
    const result = analyzer.analyze(
      bot.dwells,
      bot.flights,
      bot.corrections,
      bot.rollovers,
      bot.total,
    );
    expect(result.score).toBeLessThan(0.4);
  });

  it('scores human higher than constant bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );

    const bot = generateConstantBot(80);
    const botResult = analyzer.analyze(
      bot.dwells,
      bot.flights,
      bot.corrections,
      bot.rollovers,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('scores human higher than random-jitter bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );

    const bot = generateRandomJitterBot(80);
    const botResult = analyzer.analyze(
      bot.dwells,
      bot.flights,
      bot.corrections,
      bot.rollovers,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('scores human higher than gaussian bot', () => {
    const analyzer = createAnalyzer(defaultConfig);

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );

    const bot = generateGaussianBot(80);
    const botResult = analyzer.analyze(
      bot.dwells,
      bot.flights,
      bot.corrections,
      bot.rollovers,
      bot.total,
    );

    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  it('returns all metric scores between 0 and 1', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(80);
    const result = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
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
        data.dwells,
        data.flights,
        data.corrections,
        data.rollovers,
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
      [48, 46, 50],
      [],
      0,
      0,
      3,
    );
    expect(result.metrics.dwellVariance).toBe(0.5);
  });

  it('computes dwellVariance when n >= 5', () => {
    const analyzer = createAnalyzer(defaultConfig);
    const human = generateHumanLike(10);
    const result = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );
    // With 10 samples (≥5), dwellVariance should be computed (not neutral 0.5)
    expect(result.metrics.dwellVariance).not.toBe(0.5);
  });

  it('zero corrections are gated (excluded from score)', () => {
    const corrOnlyWeights = {
      dwellVariance: 0, flightFit: 0, timingEntropy: 0,
      correctionRatio: 1.0, burstRegularity: 0, rolloverRate: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 5, weights: corrOnlyWeights });

    // Short input — gated, no active weights → score 0
    const short = analyzer.analyze(
      new Array(10).fill(50),
      new Array(10).fill(100), 0, 0, 10,
    );
    expect(short.score).toBe(0);

    // Long input — still gated
    const long = analyzer.analyze(
      new Array(100).fill(50),
      new Array(100).fill(100), 0, 0, 100,
    );
    expect(long.score).toBe(0);
  });

  it('non-zero corrections score above zero', () => {
    const corrOnlyWeights = {
      dwellVariance: 0, flightFit: 0, timingEntropy: 0,
      correctionRatio: 1.0, burstRegularity: 0, rolloverRate: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 5, weights: corrOnlyWeights });
    // 3 corrections in 50 keystrokes (6%) — moderate human signal
    const result = analyzer.analyze(
      new Array(50).fill(50),
      new Array(50).fill(100), 3, 0, 50,
    );
    expect(result.score).toBeGreaterThan(0.6);
  });

  it('respects custom weights', () => {
    // Weight only correction ratio — human has corrections, bot does not
    const corrOnlyWeights = {
      dwellVariance: 0,
      flightFit: 0,
      timingEntropy: 0,
      correctionRatio: 1.0,
      burstRegularity: 0,
      rolloverRate: 0,
    };
    const analyzer = createAnalyzer({ minSamples: 20, weights: corrOnlyWeights });

    const human = generateHumanLike(80);
    const humanResult = analyzer.analyze(
      human.dwells,
      human.flights,
      human.corrections,
      human.rollovers,
      human.total,
    );

    const bot = generateConstantBot(80);
    const botResult = analyzer.analyze(
      bot.dwells,
      bot.flights,
      bot.corrections,
      bot.rollovers,
      bot.total,
    );

    // Human has corrections → high score; bot has 0 corrections → low score
    expect(humanResult.score).toBeGreaterThan(botResult.score);
  });

  describe('rolloverRate', () => {
    it('scores neutral (0.5) when total < 10', () => {
      const analyzer = createAnalyzer(defaultConfig);
      const result = analyzer.analyze(
        new Array(5).fill(50),
        new Array(5).fill(100),
        0, 2, 5,
      );
      expect(result.metrics.rolloverRate).toBe(0.5);
    });

    it('zero rollovers are gated (excluded from score)', () => {
      const rollOnlyWeights = {
        dwellVariance: 0, flightFit: 0, timingEntropy: 0,
        correctionRatio: 0, burstRegularity: 0, rolloverRate: 1.0,
      };
      const analyzer = createAnalyzer({ minSamples: 5, weights: rollOnlyWeights });
      const result = analyzer.analyze(
        new Array(50).fill(50),
        new Array(50).fill(100),
        0, 0, 50,
      );
      expect(result.score).toBe(0);
    });

    it('non-zero rollovers score above neutral', () => {
      const rollOnlyWeights = {
        dwellVariance: 0, flightFit: 0, timingEntropy: 0,
        correctionRatio: 0, burstRegularity: 0, rolloverRate: 1.0,
      };
      const analyzer = createAnalyzer({ minSamples: 5, weights: rollOnlyWeights });
      // 24% rollover rate (12 out of 50)
      const result = analyzer.analyze(
        new Array(50).fill(50),
        new Array(50).fill(100),
        0, 12, 50,
      );
      expect(result.score).toBeGreaterThan(0.9);
    });
  });

  describe('IKI floor', () => {
    it('penalizes sub-60ms median flights', () => {
      const fitOnlyWeights = {
        dwellVariance: 0, flightFit: 1.0, timingEntropy: 0,
        correctionRatio: 0, burstRegularity: 0, rolloverRate: 0,
      };
      const analyzer = createAnalyzer({ minSamples: 5, weights: fitOnlyWeights });
      // All flights ~30ms — physically impossible for sustained human typing
      const result = analyzer.analyze(
        new Array(50).fill(50),
        new Array(50).fill(30),
        0, 0, 50,
      );
      expect(result.metrics.flightFit).toBeLessThan(0.15);
    });

    it('does not penalize normal flights', () => {
      const fitOnlyWeights = {
        dwellVariance: 0, flightFit: 1.0, timingEntropy: 0,
        correctionRatio: 0, burstRegularity: 0, rolloverRate: 0,
      };
      const analyzer = createAnalyzer({ minSamples: 5, weights: fitOnlyWeights });
      const human = generateHumanLike(80);
      const result = analyzer.analyze(
        human.dwells,
        human.flights,
        human.corrections, human.rollovers, human.total,
      );
      // Human flights have median well above 60ms — no penalty
      expect(result.metrics.flightFit).toBeGreaterThan(0.15);
    });
  });

  describe('metric gating', () => {
    it('gated metrics report 0 in metrics object', () => {
      const analyzer = createAnalyzer(defaultConfig);
      // Bot: 0 corrections, 0 rollovers, constant flights (no bursts)
      const bot = generateConstantBot(50);
      const result = analyzer.analyze(
        bot.dwells,
        bot.flights,
        bot.corrections,
        bot.rollovers,
        bot.total,
      );
      expect(result.metrics.correctionRatio).toBe(0);
      expect(result.metrics.rolloverRate).toBe(0);
      expect(result.metrics.burstRegularity).toBe(0);
    });

    it('gated metrics do not inflate bot score', () => {
      const analyzer = createAnalyzer(defaultConfig);
      // Bot with 0 corrections, 0 rollovers, no bursts
      const bot = generateConstantBot(50);
      const result = analyzer.analyze(
        bot.dwells,
        bot.flights,
        bot.corrections,
        bot.rollovers,
        bot.total,
      );
      // Without gating this would be ~0.38; with gating should be < 0.35
      expect(result.score).toBeLessThan(0.35);
    });

    it('human with all signals scores same as before gating', () => {
      const analyzer = createAnalyzer(defaultConfig);
      const human = generateHumanLike(80);
      const result = analyzer.analyze(
        human.dwells,
        human.flights,
        human.corrections,
        human.rollovers,
        human.total,
      );
      // Human with full signals — gating doesn't apply, score stays high
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('fluctuation ratio', () => {
    it('narrow-range bot scores lower than wide-range human on timingEntropy', () => {
      const entropyOnlyWeights = {
        dwellVariance: 0, flightFit: 0, timingEntropy: 1.0,
        correctionRatio: 0, burstRegularity: 0, rolloverRate: 0,
      };
      const analyzer = createAnalyzer({ minSamples: 5, weights: entropyOnlyWeights });

      // Bot: narrow range (80–140ms), ratio ~1.75
      const bot = generateRandomJitterBot(80);
      const botResult = analyzer.analyze(
        bot.dwells,
        bot.flights,
        bot.corrections, bot.rollovers, bot.total,
      );

      // Human: wide range with pauses, ratio typically 5–15+
      const human = generateHumanLike(80);
      const humanResult = analyzer.analyze(
        human.dwells,
        human.flights,
        human.corrections, human.rollovers, human.total,
      );

      expect(humanResult.metrics.timingEntropy).toBeGreaterThan(botResult.metrics.timingEntropy);
    });
  });
});
