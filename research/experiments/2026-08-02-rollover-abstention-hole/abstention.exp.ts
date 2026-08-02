import { it } from 'vitest';
import { createAnalyzer, DEFAULT_WEIGHTS } from '../../../src/analyzer';
import { generateHumanLike } from '../../../tests/fixtures/human-profiles';
import {
  generateConstantBot,
  generateRandomJitterBot,
  generateGaussianBot,
  generateReplayBot,
} from '../../../tests/fixtures/bot-profiles';
import type { TimingData } from '../../../src/types';

// Measurement, not a gate. Run:
//   npx vitest run --config research/vitest.config.ts

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const COUNT = 80;
const HUMAN_THRESHOLD = 0.7;
const ROLLOVER_WEIGHT = DEFAULT_WEIGHTS.rolloverRate; // 0.25

// Reconstructs the active-weight sum S the analyzer would compute, from its own
// abstention rules (src/analyzer.ts:193,222,241). The other three metrics never
// abstain at count=80. ponytail: mirrors src rules; printed below so it is checkable.
function activeWeightSum(d: TimingData): number {
  let s = DEFAULT_WEIGHTS.dwellVariance + DEFAULT_WEIGHTS.flightFit + DEFAULT_WEIGHTS.timingEntropy;
  if (!(d.total >= 5 && d.corrections === 0)) s += DEFAULT_WEIGHTS.correctionRatio;
  const burstGaps = d.flights.filter((f) => f > 300).length;
  if (!(d.flights.length >= 10 && burstGaps < 2)) s += DEFAULT_WEIGHTS.burstRegularity;
  if (!(d.total >= 10 && d.rollovers === 0)) s += DEFAULT_WEIGHTS.rolloverRate;
  return s;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const generators: Record<string, (seed: number) => TimingData> = {
  human: (seed) => generateHumanLike(COUNT, seed),
  constantBot: () => generateConstantBot(COUNT),
  randomJitterBot: (seed) => generateRandomJitterBot(COUNT, seed),
  gaussianBot: (seed) => generateGaussianBot(COUNT, seed),
  replayBot: (seed) => generateReplayBot(generateHumanLike(COUNT, seed)),
};

it('measures the free score from zero-rollover abstention', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });

  for (const [name, generate] of Object.entries(generators)) {
    const cur: number[] = [];
    const cf: number[] = [];
    const drop: number[] = [];
    const sVals: number[] = [];
    let crossBack = 0;

    for (const seed of SEEDS) {
      const d = generate(seed);
      const rolloverAbstains = d.total >= 10 && d.rollovers === 0;
      const score = analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total).score;
      const S = activeWeightSum(d);
      // Counterfactual only differs when rollover actually abstained.
      const counterfactual = rolloverAbstains ? (score * S) / (S + ROLLOVER_WEIGHT) : score;
      cur.push(score);
      cf.push(counterfactual);
      drop.push(score - counterfactual);
      sVals.push(S);
      if (score >= HUMAN_THRESHOLD && counterfactual < HUMAN_THRESHOLD) crossBack++;
    }

    console.log(
      `RESULT ${name}` +
        ` medCurrent=${median(cur).toFixed(4)}` +
        ` medCounterfactual=${median(cf).toFixed(4)}` +
        ` medDrop=${median(drop).toFixed(4)}` +
        ` medActiveWeight=${median(sVals).toFixed(2)}` +
        ` crossBackBelow0.70=${crossBack}/${SEEDS.length}`,
    );
  }
});
