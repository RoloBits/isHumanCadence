import { it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import type { TimingData, MetricScores } from '../../../src/types';

// Measurement, not a gate: no assertions on the numbers. The main suite never
// runs this file (root include is tests/**/*.test.ts); use
//   npx vitest run --config research/vitest.config.ts
//
// Data file (not generated): DSL-StrongPasswordData.csv in this directory,
// fetched 2026-08-02 with
//   curl -sL -o research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv \
//     "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"

const CSV_PATH = new URL('./DSL-StrongPasswordData.csv', import.meta.url).pathname;
const REPS_PER_WINDOW = 8; // 8 reps x 11 keystrokes = 88 per window
const HUMAN_THRESHOLD = 0.7; // DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman, src/index.ts:8
const BOT_THRESHOLD = 0.35; //  DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToBot,   src/index.ts:7

interface Row {
  subject: string;
  session: number;
  rep: number;
  holds: number[]; // ms
  uds: number[]; // ms, keyup->keydown, may be <= 0 (rollover)
}

export function loadRows(): Row[] {
  const lines = readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const hIdx: number[] = [];
  const udIdx: number[] = [];
  header.forEach((c, i) => {
    if (c.startsWith('H.')) hIdx.push(i);
    if (c.startsWith('UD.')) udIdx.push(i);
  });
  return lines.slice(1).map((line) => {
    const f = line.split(',');
    return {
      subject: f[0],
      session: Number(f[1]),
      rep: Number(f[2]),
      holds: hIdx.map((i) => Number(f[i]) * 1000),
      uds: udIdx.map((i) => Number(f[i]) * 1000),
    };
  });
}

/** Map a chunk of consecutive repetitions to TimingData with observer semantics. */
export function windowToTimingData(chunk: Row[]): TimingData {
  const dwells: number[] = [];
  const flights: number[] = [];
  let rollovers = 0;
  let total = 0;
  for (const row of chunk) {
    dwells.push(...row.holds);
    total += row.holds.length;
    for (const ud of row.uds) {
      // src/observer.ts:96-101 — overlap counts as rollover and records no flight
      if (ud <= 0) rollovers++;
      else flights.push(ud);
    }
  }
  return { dwells, flights, corrections: 0, rollovers, total };
}

export function buildWindows(rows: Row[]): { subject: string; data: TimingData }[] {
  const bySession = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.subject}|${r.session}`;
    let arr = bySession.get(key);
    if (!arr) bySession.set(key, (arr = []));
    arr.push(r);
  }
  const windows: { subject: string; data: TimingData }[] = [];
  for (const [key, arr] of bySession) {
    arr.sort((a, b) => a.rep - b.rep);
    const subject = key.split('|')[0];
    for (let w = 0; w + REPS_PER_WINDOW <= arr.length; w += REPS_PER_WINDOW) {
      windows.push({ subject, data: windowToTimingData(arr.slice(w, w + REPS_PER_WINDOW)) });
    }
  }
  return windows;
}

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function describe(name: string, scores: number[]) {
  const s = [...scores].sort((a, b) => a - b);
  const above = s.filter((x) => x >= HUMAN_THRESHOLD).length;
  const below = s.filter((x) => x < BOT_THRESHOLD).length;
  console.log(
    `RESULT ${name} n=${s.length}` +
      ` min=${s[0].toFixed(4)} p05=${pct(s, 0.05).toFixed(4)} median=${pct(s, 0.5).toFixed(4)}` +
      ` p95=${pct(s, 0.95).toFixed(4)} max=${s[s.length - 1].toFixed(4)}` +
      ` fracAtOrAbove0.70=${(above / s.length).toFixed(3)}` +
      ` fracBelow0.35=${(below / s.length).toFixed(3)}`,
  );
}

it('scores 2448 real-human 88-keystroke windows from the CMU benchmark', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });
  const windows = buildWindows(loadRows());

  const scores: number[] = [];
  const bySubject = new Map<string, number[]>();
  const metricSum: Record<keyof MetricScores, number[]> = {
    dwellVariance: [], flightFit: [], timingEntropy: [],
    correctionRatio: [], burstRegularity: [], rolloverRate: [],
  };
  let zeroRollover = 0;
  let burstAbstain = 0;

  for (const { subject, data } of windows) {
    const r = analyzer.analyze(data.dwells, data.flights, data.corrections, data.rollovers, data.total);
    scores.push(r.score);
    let arr = bySubject.get(subject);
    if (!arr) bySubject.set(subject, (arr = []));
    arr.push(r.score);
    for (const k of Object.keys(metricSum) as (keyof MetricScores)[]) metricSum[k].push(r.metrics[k]);
    if (data.rollovers === 0) zeroRollover++;
    // burstRegularity abstains when fewer than 2 flights exceed 300ms (src/analyzer.ts:222)
    if (data.flights.filter((f) => f > 300).length < 2) burstAbstain++;
  }

  describe('cmuHumanWindows', scores);

  const subjectMedians = [...bySubject.values()].map((arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return pct(s, 0.5);
  });
  describe('cmuSubjectMedians', subjectMedians);

  const subjectMins = [...bySubject.values()].map((arr) => Math.min(...arr));
  describe('cmuSubjectMins', subjectMins);

  for (const k of Object.keys(metricSum) as (keyof MetricScores)[]) {
    const s = metricSum[k].sort((a, b) => a - b);
    console.log(`METRIC ${k} median=${pct(s, 0.5).toFixed(4)} min=${s[0].toFixed(4)} max=${s[s.length - 1].toFixed(4)}`);
  }
  console.log(
    `ABSTAIN windows=${windows.length} zeroRollover=${zeroRollover}` +
      ` burstAbstain=${burstAbstain} correctionAbstain=${windows.length} (corpus has no corrections)`,
  );
});
