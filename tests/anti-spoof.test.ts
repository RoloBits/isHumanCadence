import { describe, it, expect } from 'vitest';
import {
  computeLogNormalityScore,
  computeUniformityScore,
  detectSpoof,
} from '../src/anti-spoof';
import { generateConstantBot, generateRandomJitterBot, generateGaussianBot } from './fixtures/bot-profiles';
import { generateHumanLike } from './fixtures/human-profiles';

describe('computeLogNormalityScore', () => {
  it('returns 0.5 (neutral) for insufficient data', () => {
    expect(computeLogNormalityScore([1, 2, 3])).toBe(0.5);
  });

  it('scores human-like log-normal data high', () => {
    const human = generateHumanLike(80);
    const score = computeLogNormalityScore(human.flights);
    expect(score).toBeGreaterThan(0.5);
  });

  it('scores constant bot data low', () => {
    const bot = generateConstantBot(50);
    const score = computeLogNormalityScore(bot.flights);
    expect(score).toBeLessThan(0.2);
  });

  it('scores uniform random jitter lower than human', () => {
    const bot = generateRandomJitterBot(80);
    const human = generateHumanLike(80);
    const botScore = computeLogNormalityScore(bot.flights);
    const humanScore = computeLogNormalityScore(human.flights);
    expect(humanScore).toBeGreaterThan(botScore);
  });
});

describe('computeUniformityScore', () => {
  it('returns 0.5 for insufficient data', () => {
    expect(computeUniformityScore([1, 2])).toBe(0.5);
  });

  it('scores uniform random data high (bot-like)', () => {
    const bot = generateRandomJitterBot(80);
    const score = computeUniformityScore(bot.flights);
    expect(score).toBeGreaterThan(0.4);
  });

  it('returns 0 for constant data (degenerate, not uniform)', () => {
    const bot = generateConstantBot(50);
    const score = computeUniformityScore(bot.flights);
    expect(score).toBe(0);
  });

  it('scores human data lower than uniform bot data', () => {
    const bot = generateRandomJitterBot(80);
    const human = generateHumanLike(80);
    const botScore = computeUniformityScore(bot.flights);
    const humanScore = computeUniformityScore(human.flights);
    expect(botScore).toBeGreaterThan(humanScore);
  });
});

describe('detectSpoof', () => {
  it('gives high genuineScore for human-like data', () => {
    const human = generateHumanLike(80);
    const result = detectSpoof(human.flights);
    expect(result.genuineScore).toBeGreaterThan(0.45);
  });

  it('gives low genuineScore for constant bot', () => {
    const bot = generateConstantBot(50);
    const result = detectSpoof(bot.flights);
    expect(result.genuineScore).toBeLessThan(0.4);
  });

  it('gives lower genuineScore for random-jitter bot than human', () => {
    const bot = generateRandomJitterBot(80);
    const human = generateHumanLike(80);
    const botResult = detectSpoof(bot.flights);
    const humanResult = detectSpoof(human.flights);
    expect(humanResult.genuineScore).toBeGreaterThan(botResult.genuineScore);
  });

  it('gives lower genuineScore for gaussian bot than human', () => {
    const bot = generateGaussianBot(80);
    const human = generateHumanLike(80);
    const botResult = detectSpoof(bot.flights);
    const humanResult = detectSpoof(human.flights);
    expect(humanResult.genuineScore).toBeGreaterThan(botResult.genuineScore);
  });

  it('returns neutral scores for insufficient data', () => {
    const result = detectSpoof([50, 60]);
    expect(result.genuineScore).toBeGreaterThan(0.2);
    expect(result.genuineScore).toBeLessThan(0.8);
  });

  it('exposes individual metrics', () => {
    const human = generateHumanLike(80);
    const result = detectSpoof(human.flights);
    expect(result).toHaveProperty('logNormality');
    expect(result).toHaveProperty('uniformity');
    expect(result).toHaveProperty('serialCorrelation');
    expect(typeof result.logNormality).toBe('number');
    expect(typeof result.uniformity).toBe('number');
    expect(typeof result.serialCorrelation).toBe('number');
  });
});
