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

// Measurement, not a gate: no assertions on the numbers. The main suite never
// runs this file (root include is tests/**/*.test.ts); use
//   npx vitest run --config research/vitest.config.ts

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const COUNT = 80;
// DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman, src/index.ts:8
const HUMAN_THRESHOLD = 0.7;

const generators: Record<string, (seed: number) => TimingData> = {
  human: (seed) => generateHumanLike(COUNT, seed),
  // constantBot ignores the seed: all 50 runs are identical. Kept as a floor reference.
  constantBot: () => generateConstantBot(COUNT),
  randomJitterBot: (seed) => generateRandomJitterBot(COUNT, seed),
  gaussianBot: (seed) => generateGaussianBot(COUNT, seed),
  replayBot: (seed) => generateReplayBot(generateHumanLike(COUNT, seed)),
};

it('sweeps 50 seeds x 5 generators against the 0.70 human threshold', () => {
  const analyzer = createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 });

  for (const [name, generate] of Object.entries(generators)) {
    const scores = SEEDS.map((seed) => {
      const d = generate(seed);
      return analyzer.analyze(d.dwells, d.flights, d.corrections, d.rollovers, d.total).score;
    }).sort((a, b) => a - b);

    const median = scores[Math.floor(scores.length / 2)];
    const above = scores.filter((s) => s >= HUMAN_THRESHOLD).length;

    console.log(
      `RESULT ${name} n=${scores.length}` +
        ` min=${scores[0].toFixed(4)}` +
        ` median=${median.toFixed(4)}` +
        ` max=${scores[scores.length - 1].toFixed(4)}` +
        ` fracAtOrAbove0.70=${(above / scores.length).toFixed(2)}`,
    );
  }
});
