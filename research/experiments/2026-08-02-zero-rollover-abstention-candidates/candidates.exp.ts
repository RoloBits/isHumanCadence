import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import type { TimingData } from '../../../src/types';
import { loadRows, buildWindows } from '../2026-08-02-cmu-real-human-baseline/baseline.exp';
import { generateHumanLike } from '../../../tests/fixtures/human-profiles';
import {
  generateConstantBot,
  generateRandomJitterBot,
  generateGaussianBot,
  generateReplayBot,
} from '../../../tests/fixtures/bot-profiles';

// Measurement, not a gate. Run with:
//   npx vitest run --config research/vitest.config.ts
//
// Variant scores are computed by EXACT re-weighting of the analyzer's composite,
// not by editing src/. The composite is a weighted mean over non-NO_DATA metrics
// (src/analyzer.ts:281-295): score = sum(w_k * m_k) / sum(w_k) over voting metrics.
// Turning an abstaining metric into a voter with weight w and vote v gives
//   new = (score * W + w*v) / (W + w),  W = active weight of the baseline window.

const HUMAN_THRESHOLD = 0.7;
const FLOOR = 0.4635; // real-human minimum, cmu baseline RESULTS.md

const W = DEFAULT_WEIGHTS;

/** Which NO_DATA metrics abstained for this window (src/analyzer.ts:193,222,241). */
function abstentions(d: TimingData) {
  const correctionAbstains = d.total >= 5 && d.corrections === 0;
  const rolloverAbstains = d.total >= 10 && d.rollovers === 0;
  const burstAbstains =
    d.flights.length >= 10 && d.flights.filter((f) => f > 300).length < 2;
  return { correctionAbstains, rolloverAbstains, burstAbstains };
}

/** Active weight W = 1 - weights of abstaining metrics. */
function activeWeight(d: TimingData): number {
  const a = abstentions(d);
  let w = 1;
  if (a.correctionAbstains) w -= W.correctionRatio;
  if (a.rolloverAbstains) w -= W.rolloverRate;
  if (a.burstAbstains) w -= W.burstRegularity;
  return w;
}

type Candidate = 'baseline' | 'A' | 'B' | 'C';

/** Extra votes a candidate adds to a window: [weight, vote] pairs. */
function extraVotes(cand: Candidate, d: TimingData): [number, number][] {
  const a = abstentions(d);
  const votes: [number, number][] = [];
  if (cand === 'A' && a.rolloverAbstains) votes.push([W.rolloverRate, 0]);
  if (cand === 'B' && a.rolloverAbstains) votes.push([W.rolloverRate, 0.5]);
  if (cand === 'C') {
    if (a.rolloverAbstains) votes.push([W.rolloverRate, 0]);
    if (a.correctionAbstains) votes.push([W.correctionRatio, 0]);
  }
  return votes;
}

function variantScore(cand: Candidate, baseScore: number, d: TimingData): number {
  const votes = extraVotes(cand, d);
  if (votes.length === 0) return baseScore;
  const Wact = activeWeight(d);
  let num = baseScore * Wact;
  let den = Wact;
  for (const [w, v] of votes) {
    num += w * v;
    den += w;
  }
  return num / den;
}

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function describe(name: string, scores: number[], countFloor = false) {
  const s = [...scores].sort((a, b) => a - b);
  const above = s.filter((x) => x >= HUMAN_THRESHOLD).length;
  const belowFloor = s.filter((x) => x < FLOOR).length;
  console.log(
    `RESULT ${name} n=${s.length}` +
      ` min=${s[0].toFixed(4)} p05=${pct(s, 0.05).toFixed(4)} median=${pct(s, 0.5).toFixed(4)}` +
      ` fracAtOrAbove0.70=${(above / s.length).toFixed(3)}` +
      (countFloor ? ` belowFloor(${FLOOR})=${belowFloor}` : ''),
  );
}

it('re-weights zero-rollover abstention: candidates A/B/C vs the human floor', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });
  const cands: Candidate[] = ['baseline', 'A', 'B', 'C'];

  // ── CMU real humans ──
  const cmu = buildWindows(loadRows());
  const cmuBase = cmu.map(({ data }) => ({
    data,
    score: analyzer.analyze(data.dwells, data.flights, data.corrections, data.rollovers, data.total).score,
  }));

  // Self-check: on windows with rollovers>0 AND corrections>0, no candidate moves the score.
  let selfCheckFail = 0;
  for (const { data, score } of cmuBase) {
    if (data.rollovers > 0 && data.corrections > 0) {
      for (const c of cands) {
        if (Math.abs(variantScore(c, score, data) - score) > 1e-12) selfCheckFail++;
      }
    }
  }
  console.log(`SELFCHECK cmu nonAbstainingWindowsMoved=${selfCheckFail} (expect 0)`);

  for (const c of cands) {
    describe(`cmu_${c}`, cmuBase.map(({ data, score }) => variantScore(c, score, data)), true);
  }

  // ── Fixture bots + synthetic human, 50 seeds, count 80 (as the fixture sweep) ──
  const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
  const generators: Record<string, (seed: number) => TimingData> = {
    human: (seed) => generateHumanLike(80, seed),
    randomJitterBot: (seed) => generateRandomJitterBot(80, seed),
    gaussianBot: (seed) => generateGaussianBot(80, seed),
    replayBot: (seed) => generateReplayBot(generateHumanLike(80, seed)),
    constantBot: () => generateConstantBot(80),
  };
  for (const [gname, gen] of Object.entries(generators)) {
    const base = SEEDS.map((seed) => {
      const d = gen(seed);
      return { data: d, score: analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total).score };
    });
    for (const c of cands) {
      describe(`${gname}_${c}`, base.map(({ data, score }) => variantScore(c, score, data)));
    }
  }
});
