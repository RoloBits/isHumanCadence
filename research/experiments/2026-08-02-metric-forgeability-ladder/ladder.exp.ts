import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import { generateHumanLike } from '../../../tests/fixtures/human-profiles';
import { generateConstantBot, generateGaussianBot } from '../../../tests/fixtures/bot-profiles';
import type { TimingData } from '../../../src/types';

// Measurement, not a gate. Run:
//   npx vitest run --config research/vitest.config.ts

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const COUNT = 80;
const HUMAN_THRESHOLD = 0.7;

// Same xorshift32 + Box-Muller the fixtures use, so forgers are seeded and deterministic.
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

// Forger 3: log-normal flights (median ~90ms), constant dwell, no corr/roll.
function forgerLogFlights(count: number, seed: number): TimingData {
  const rng = createRng(seed);
  const flights = Array.from({ length: count }, () =>
    Math.max(15, Math.exp(4.5 + 0.6 * normalRandom(rng))),
  );
  return { dwells: Array(count).fill(50), flights, corrections: 0, rollovers: 0, total: count };
}

// Forger 4: log-normal flights + log-normal dwell, no corr/roll.
function forgerLogFlightsDwell(count: number, seed: number): TimingData {
  const rng = createRng(seed);
  const flights = Array.from({ length: count }, () =>
    Math.max(15, Math.exp(4.5 + 0.6 * normalRandom(rng))),
  );
  const dwells = Array.from({ length: count }, () =>
    Math.max(10, Math.exp(3.5 + 0.4 * normalRandom(rng))),
  );
  return { dwells, flights, corrections: 0, rollovers: 0, total: count };
}

// Forger 5: forger 4 + injected corrections (~7%) + injected rollovers (~25%).
// The bobbiechen-class script: knows the five metric names, sets each input human-typical.
function forgerMetricAware(count: number, seed: number): TimingData {
  const base = forgerLogFlightsDwell(count, seed);
  return {
    ...base,
    corrections: Math.floor(count * 0.07),
    rollovers: Math.floor(count * 0.25),
  };
}

const forgers: Record<string, (seed: number) => TimingData> = {
  '1_constant': () => generateConstantBot(COUNT),
  '2_gaussianJitter': (seed) => generateGaussianBot(COUNT, seed),
  '3_logFlights': (seed) => forgerLogFlights(COUNT, seed),
  '4_logFlightsDwell': (seed) => forgerLogFlightsDwell(COUNT, seed),
  '5_metricAware': (seed) => forgerMetricAware(COUNT, seed),
  '0_humanControl': (seed) => generateHumanLike(COUNT, seed),
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

it('scores five escalating forgers per-metric and final', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });
  const metricKeys = [
    'dwellVariance', 'flightFit', 'timingEntropy',
    'correctionRatio', 'burstRegularity', 'rolloverRate',
  ] as const;

  for (const [name, generate] of Object.entries(forgers)) {
    const finals: number[] = [];
    const perMetric: Record<string, number[]> = Object.fromEntries(metricKeys.map((k) => [k, []]));
    let reachHuman = 0;

    for (const seed of SEEDS) {
      const d = generate(seed);
      const r = analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total);
      finals.push(r.score);
      for (const k of metricKeys) perMetric[k].push(r.metrics[k]);
      if (r.score >= HUMAN_THRESHOLD) reachHuman++;
    }

    const metricStr = metricKeys.map((k) => `${k}=${mean(perMetric[k]).toFixed(2)}`).join(' ');
    console.log(
      `RESULT ${name} medFinal=${median(finals).toFixed(4)}` +
        ` reachHuman=${reachHuman}/${SEEDS.length} | ${metricStr}`,
    );
  }
});
