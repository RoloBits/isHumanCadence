import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import type { TimingData } from '../../../src/types';

// Measurement, not a gate. Run:
//   npx vitest run --config research/vitest.config.ts
// SYNTHETIC PARAMETER SWEEP rung — ranges are literature-informed engineering ranges,
// NOT extracted from a measured corpus. See HYPOTHESIS.md.

const N = 500;
const COUNT = 80;
const HUMAN_THRESHOLD = 0.7;
const BOT_THRESHOLD = 0.35;

// xorshift32, but with the seed mixed (Knuth multiplicative) and warmed up.
// Sequential small seeds otherwise share low-entropy first draws, which here
// collapsed every sample's first draw (median flight) into the same narrow band.
function createRng(seed: number) {
  let s = (Math.imul(seed, 0x9e3779b1) ^ 0x85ebca6b) | 0;
  if (s === 0) s = 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  for (let i = 0; i < 8; i++) next(); // warm up
  return next;
}
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

interface WHuman extends TimingData {
  medianFlight: number;
}

// A widened human: median flight 120-400ms, dwell 25-110ms, corrections 0-15%,
// rollover tied to speed (slow typists can hit exactly 0).
function widenedHuman(seed: number): WHuman {
  const rng = createRng(seed);
  const medianFlight = 120 + rng() * 280; // 120..400 ms
  const flightSigma = 0.4 + rng() * 0.3; // 0.4..0.7
  const muF = Math.log(medianFlight);

  const flights: number[] = [];
  for (let i = 0; i < COUNT; i++) {
    let f = Math.exp(muF + flightSigma * normalRandom(rng));
    if (rng() < 0.1) f += 200 + rng() * 500; // thinking pauses
    flights.push(Math.max(15, f));
  }

  const medianDwell = 25 + rng() * 85; // 25..110 ms
  const muD = Math.log(medianDwell);
  const dwells = Array.from({ length: COUNT }, () =>
    Math.max(8, Math.exp(muD + 0.35 * normalRandom(rng))),
  );

  const corrections = Math.floor(COUNT * (rng() * 0.15));

  const fast = medianFlight < 180;
  const rolloverRate = fast ? 0.15 + rng() * 0.3 : rng() * 0.1;
  const rollovers = Math.floor(COUNT * rolloverRate);

  return { dwells, flights, corrections, rollovers, total: COUNT, medianFlight };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const frac = (xs: number[], pred: (x: number) => boolean) =>
  xs.filter(pred).length / xs.length;

it('measures the false-positive rate on a widened human population', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });

  const all: number[] = [];
  const fastScores: number[] = [];
  const slowScores: number[] = [];
  let zeroRolloverCount = 0;
  const zeroRolloverScores: number[] = [];

  for (let seed = 1; seed <= N; seed++) {
    const h = widenedHuman(seed);
    const score = analyzer.analyze(h.dwells, h.flights, h.corrections, h.rollovers, h.total).score;
    all.push(score);
    if (h.medianFlight < 180) fastScores.push(score);
    else slowScores.push(score);
    if (h.rollovers === 0) {
      zeroRolloverCount++;
      zeroRolloverScores.push(score);
    }
  }

  const line = (label: string, xs: number[]) =>
    xs.length === 0
      ? `RESULT ${label} n=0 (empty)`
      : `RESULT ${label} n=${xs.length}` +
    ` min=${Math.min(...xs).toFixed(4)}` +
    ` median=${median(xs).toFixed(4)}` +
    ` max=${Math.max(...xs).toFixed(4)}` +
    ` fpBelow0.70=${frac(xs, (s) => s < HUMAN_THRESHOLD).toFixed(3)}` +
    ` hardFpBelow0.35=${frac(xs, (s) => s < BOT_THRESHOLD).toFixed(3)}`;

  console.log(line('all', all));
  console.log(line('fastTypists', fastScores));
  console.log(line('slowTypists', slowScores));
  console.log(line('zeroRollover', zeroRolloverScores));
  console.log(`RESULT zeroRolloverShare=${(zeroRolloverCount / N).toFixed(3)}`);
});
