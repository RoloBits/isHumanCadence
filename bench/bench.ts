import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../src/analyzer';
import { generateHumanLike } from '../tests/fixtures/human-profiles';
import {
  generateConstantBot,
  generateRandomJitterBot,
  generateGaussianBot,
  generateReplayBot,
} from '../tests/fixtures/bot-profiles';
import type { TimingData } from '../src/types';

// Measurement, not a gate. Run with: npm run bench
// Scores the current working-tree engine (src/) against both error types:
//   HUMAN_FP — fraction of real CMU windows below the confident-human threshold
//   BOT_FN   — fraction of bot runs at or above it
// Deterministic: fixed seeds, no Math.random(), no Date.now().

const CSV_PATH = join(
  __dirname,
  '../research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv',
);
const CURL =
  'curl -o research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv';

// DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman, src/index.ts:8
const HUMAN_THRESHOLD = 0.7;
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const COUNT = 80;

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/**
 * CMU Killourhy-Maxion CSV → TimingData windows of 8 consecutive reps
 * (88 keystrokes) within a (subject, session) group. Mapping: H.* → dwell,
 * UD.* → flight when UD > 0, else rollover. Times are seconds in the CSV,
 * ms in TimingData. The password has no backspaces, so corrections = 0.
 * 51 subjects x 8 sessions x 6 windows = 2448 windows. This windowing
 * reproduces the recorded baseline (median 0.8044, floor 0.4635, 16.7%
 * below 0.70) digit for digit — keep it fixed so numbers stay comparable.
 */
const REPS_PER_WINDOW = 8;

function loadCmuWindows(): TimingData[] {
  const lines = readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  const groups = new Map<string, string[][]>();
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const key = `${cols[0]}:${cols[1]}`; // subject:sessionIndex
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cols);
  }
  const windows: TimingData[] = [];
  for (const reps of groups.values()) {
    for (let start = 0; start + REPS_PER_WINDOW <= reps.length; start += REPS_PER_WINDOW) {
      const w: TimingData = { dwells: [], flights: [], corrections: 0, rollovers: 0, total: 0 };
      for (let r = start; r < start + REPS_PER_WINDOW; r++) {
        const cols = reps[r];
        // cols[3..33]: H, then (DD, UD, H) x 10
        w.dwells.push(Number(cols[3]) * 1000);
        w.total++;
        for (let i = 4; i < 34; i += 3) {
          const ud = Number(cols[i + 1]);
          if (ud > 0) w.flights.push(ud * 1000);
          else w.rollovers++;
          w.dwells.push(Number(cols[i + 2]) * 1000);
          w.total++;
        }
      }
      windows.push(w);
    }
  }
  return windows;
}

// --- the metric-aware forger, ported from the forgeability ladder -------------
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
function forgerMetricAware(count: number, seed: number): TimingData {
  const rng = createRng(seed);
  const flights = Array.from({ length: count }, () =>
    Math.max(15, Math.exp(4.5 + 0.6 * normalRandom(rng))),
  );
  const dwells = Array.from({ length: count }, () =>
    Math.max(10, Math.exp(3.5 + 0.4 * normalRandom(rng))),
  );
  return {
    dwells,
    flights,
    corrections: Math.floor(count * 0.07),
    rollovers: Math.floor(count * 0.25),
    total: count,
  };
}

const bots: Record<string, (seed: number) => TimingData> = {
  constantBot: () => generateConstantBot(COUNT),
  randomJitterBot: (seed) => generateRandomJitterBot(COUNT, seed),
  gaussianBot: (seed) => generateGaussianBot(COUNT, seed),
  replayBot: (seed) => generateReplayBot(generateHumanLike(COUNT, seed)),
  // The adversary that matters, ported verbatim from
  // research/experiments/2026-08-02-metric-forgeability-ladder/ladder.exp.ts so the
  // bench and the research report the SAME forger. It builds its own log-normal
  // timings — it does not borrow the human fixture — then injects the two
  // count-based metrics an attacker gets for free.
  //
  // The previous version was `{...generateHumanLike(seed), rollovers: 0}`: the repo's
  // own human fixture with one field zeroed. Its BOT_FN=1.0000 was close to arithmetic
  // rather than a finding about adversaries, and in a project whose argument is "do not
  // test your model against your model" that was the wrong generator to headline.
  metricAwareForger: (seed) => forgerMetricAware(COUNT, seed),
};

it('benchmarks the working-tree engine against CMU humans and bot generators', () => {
  if (!existsSync(CSV_PATH)) {
    throw new Error(
      `CMU corpus not found at ${CSV_PATH}\n` +
        `Download it first (4.5MB, gitignored on purpose):\n  ${CURL}`,
    );
  }

  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });
  const score = (d: TimingData) =>
    analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total).score;

  // Human false positives — real CMU windows below the confident-human threshold
  const humanScores = loadCmuWindows().map(score).sort((a, b) => a - b);
  const fpCount = humanScores.filter((s) => s < HUMAN_THRESHOLD).length;
  const humanFp = fpCount / humanScores.length;
  console.log(
    `HUMAN cmu n=${humanScores.length}` +
      ` min=${humanScores[0].toFixed(4)}` +
      ` p05=${percentile(humanScores, 0.05).toFixed(4)}` +
      ` median=${percentile(humanScores, 0.5).toFixed(4)}` +
      ` fracBelow0.70=${humanFp.toFixed(4)}`,
  );

  // Bot false negatives — generator runs at or above the threshold
  const botFn: Record<string, number> = {};
  for (const [name, generate] of Object.entries(bots)) {
    const scores = SEEDS.map((seed) => score(generate(seed))).sort((a, b) => a - b);
    const passing = scores.filter((s) => s >= HUMAN_THRESHOLD).length;
    botFn[name] = passing / scores.length;
    console.log(
      `BOT ${name} n=${scores.length}` +
        ` median=${percentile(scores, 0.5).toFixed(4)}` +
        ` fracAtOrAbove0.70=${botFn[name].toFixed(4)}`,
    );
  }

  console.log('--- SUMMARY ---');
  console.log(`HUMAN_FP=${humanFp.toFixed(4)}`);
  for (const [name, fn] of Object.entries(botFn)) {
    console.log(`BOT_FN ${name}=${fn.toFixed(4)}`);
  }
});
