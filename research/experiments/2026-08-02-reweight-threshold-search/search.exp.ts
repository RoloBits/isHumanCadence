import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import type { TimingData, MetricWeights, MetricScores } from '../../../src/types';
import { loadRows, buildWindows } from '../2026-08-02-cmu-real-human-baseline/baseline.exp';
import { generateGaussianBot } from '../../../tests/fixtures/bot-profiles';

// Measurement, not a gate. Run:
//   npx vitest run --config research/vitest.config.ts
// Rescoring is EXACT re-weighting of the analyzer composite (no change to src/): the
// composite is a weighted mean over non-NO_DATA metrics (src/analyzer.ts:281-295).

const METRIC_KEYS = [
  'dwellVariance', 'flightFit', 'timingEntropy',
  'correctionRatio', 'burstRegularity', 'rolloverRate',
] as const;

// ── forger 5 from the ladder experiment, reproduced verbatim (seeded) ──
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
    dwells, flights,
    corrections: Math.floor(count * 0.07),
    rollovers: Math.floor(count * 0.25),
    total: count,
  };
}

// Abstention flags, from the analyzer's own conditions (src/analyzer.ts:193,222,241).
function abstain(d: TimingData) {
  return {
    correctionRatio: d.total >= 5 && d.corrections === 0,
    rolloverRate: d.total >= 10 && d.rollovers === 0,
    burstRegularity: d.flights.length >= 10 && d.flights.filter((f) => f > 300).length < 2,
  };
}

interface Sample {
  metrics: MetricScores; // NO_DATA already mapped to 0 by analyzer
  abst: ReturnType<typeof abstain>;
}

type Treat = { zeroRollover?: number; zeroCorrection?: number }; // vote value or undefined=skip

function scoreSample(s: Sample, w: MetricWeights, treat: Treat): number {
  let num = 0;
  let den = 0;
  for (const k of METRIC_KEYS) {
    const abstains =
      (k === 'correctionRatio' && s.abst.correctionRatio) ||
      (k === 'rolloverRate' && s.abst.rolloverRate) ||
      (k === 'burstRegularity' && s.abst.burstRegularity);
    if (!abstains) {
      num += w[k] * s.metrics[k];
      den += w[k];
      continue;
    }
    // Metric abstains — apply the candidate treatment for rollover/correction.
    let vote: number | undefined;
    if (k === 'rolloverRate') vote = treat.zeroRollover;
    else if (k === 'correctionRatio') vote = treat.zeroCorrection;
    if (vote !== undefined) {
      num += w[k] * vote;
      den += w[k];
    }
  }
  return den > 0 ? num / den : 0;
}

const frac = (xs: number[], pred: (x: number) => boolean) => xs.filter(pred).length / xs.length;

it('searches weights + threshold against CMU humans and the metric-aware forger', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });

  const toSample = (d: TimingData): { d: TimingData; s: Sample; base: number } => {
    const r = analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total);
    return { d, s: { metrics: r.metrics, abst: abstain(d) }, base: r.score };
  };

  const cmu = buildWindows(loadRows()).map(({ data }) => toSample(data));
  const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
  const gauss = SEEDS.map((seed) => toSample(generateGaussianBot(80, seed)));
  const aware = SEEDS.map((seed) => toSample(forgerMetricAware(80, seed)));

  // Self-check: reconstruction under DEFAULT_WEIGHTS with abstention-as-skip == shipped score.
  let selfFail = 0;
  for (const set of [cmu, gauss, aware]) {
    for (const { s, base } of set) {
      if (Math.abs(scoreSample(s, DEFAULT_WEIGHTS, {}) - base) > 1e-9) selfFail++;
    }
  }
  console.log(`SELFCHECK reconstructionMismatches=${selfFail} (expect 0)`);

  const configs: { name: string; w: MetricWeights; treat: Treat; thr: number }[] = [
    { name: 'baseline', w: DEFAULT_WEIGHTS, treat: {}, thr: 0.70 },
    { name: 'B_zeroRoll=0.5', w: DEFAULT_WEIGHTS, treat: { zeroRollover: 0.5 }, thr: 0.70 },
    {
      name: 'upRollover',
      w: { ...DEFAULT_WEIGHTS, rolloverRate: 0.35, flightFit: 0.05 },
      treat: {}, thr: 0.70,
    },
    {
      name: 'upRollover+B',
      w: { ...DEFAULT_WEIGHTS, rolloverRate: 0.35, flightFit: 0.05 },
      treat: { zeroRollover: 0.5 }, thr: 0.70,
    },
  ];

  const report = (name: string, w: MetricWeights, treat: Treat, thr: number) => {
    const humanFP = frac(cmu.map(({ s }) => scoreSample(s, w, treat)), (x) => x < thr);
    const gaussFN = frac(gauss.map(({ s }) => scoreSample(s, w, treat)), (x) => x >= thr);
    const awareFN = frac(aware.map(({ s }) => scoreSample(s, w, treat)), (x) => x >= thr);
    console.log(
      `RESULT ${name} thr=${thr.toFixed(2)}` +
        ` humanFP=${humanFP.toFixed(3)}` +
        ` gaussianFN=${gaussFN.toFixed(3)}` +
        ` metricAwareFN=${awareFN.toFixed(3)}`,
    );
  };

  for (const c of configs) report(c.name, c.w, c.treat, c.thr);

  // Threshold sweep on baseline weights: what does catching the metric-aware forger cost humans?
  for (const thr of [0.70, 0.78, 0.82, 0.86]) {
    report(`thresholdSweep`, DEFAULT_WEIGHTS, {}, thr);
  }
});
