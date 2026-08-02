# Hypothesis

The seeded bot fixtures in `tests/fixtures/bot-profiles.ts` score below
`DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman` (0.70, `src/index.ts:8`), so the suite's
ordering assertions ("human scores above bot") are backed by a real margin, not by luck of
the two or three seeds the tests happen to use.

Refutation: any bot generator whose **median** score over the sweep lands at or above 0.70.
A single outlier seed above 0.70 weakens the margin but does not refute on its own; a median
above it means the typical output of that generator would cross the human threshold.

## Method

- 50 seeds (1..50), `count = 80` keystrokes per run.
- Generators: `generateHumanLike`, `generateConstantBot`, `generateRandomJitterBot`,
  `generateGaussianBot`, and `generateReplayBot` fed a fresh `generateHumanLike(80, seed)`.
- Scoring: `createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 })`, then
  `analyze(dwells, flights, corrections, rollovers, total)` per `TimingData`.
- Reported per generator: n, min, median, max, and the fraction of seeds scoring >= 0.70.
- `generateConstantBot` takes no seed, so its 50 runs are identical; it is kept in the sweep
  as a floor reference.

## Honesty note

This file is being written after an informal probe (2026-08-02, seed 42, count 80) already
suggested refutation — it printed `gaussianBot = 0.7028`, above the threshold. That is
exactly why the sweep is being formalised: to find out whether seed 42 was an outlier or the
typical case, over a distribution instead of a point.
