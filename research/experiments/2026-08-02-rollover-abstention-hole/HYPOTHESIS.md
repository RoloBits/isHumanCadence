# Hypothesis — the rollover=0 abstention hands bots free score

Every bot generator in `tests/fixtures/bot-profiles.ts` emits `rollovers: 0`. In
`src/analyzer.ts:241`, `scoreRolloverRate` returns the `NO_DATA` sentinel when
`rollovers === 0`, and the weighted mean (`src/analyzer.ts:288-295`) drops any `NO_DATA`
metric from **both** numerator and denominator. `rolloverRate` carries the largest default
weight, 0.25 (`src/analyzer.ts:26`). So on every bot, a quarter of the model's weight never
votes — and it is the metric on which the bot is most obviously non-human (it never overlaps
keys).

**Hypothesis:** the abstention materially inflates bot scores. If zero rollovers scored as
the analyzer's own sigmoid would score them at ratio 0 — which is exactly 0 after floor
normalisation (`src/analyzer.ts:243-245`) — instead of abstaining, every bot's score would
drop.

**Refutation:** the counterfactual score (zero-rollover forced to vote 0) is not
meaningfully below the current abstaining score for the bots — i.e. the drop is under, say,
0.03 — meaning the abstention is not doing the work.

## Method

- Generators: `generateConstantBot`, `generateRandomJitterBot`, `generateGaussianBot`,
  `generateReplayBot(generateHumanLike(80, seed))`, and `generateHumanLike` as a control.
- 50 seeds, `count = 80`, `createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 })`.
- Current score: `analyze(...)` as shipped.
- Counterfactual: the analyzer redistributes weight, so with active-weight sum `S`, forcing
  `rolloverRate = 0` into the mean gives exactly `score_current * S / (S + 0.25)`. `S` is
  reconstructed from the analyzer's own abstention rules (correctionRatio abstains at
  `corrections === 0`, `:193`; burstRegularity at fewer than 2 gaps over 300 ms, `:222`;
  rolloverRate at `rollovers === 0`, `:241`; the other three never abstain given 80
  samples). `S` is printed so the reconstruction is inspectable.
- Report per generator: median current score, median counterfactual score, median drop, and
  how many seeds cross back below the 0.70 human threshold under the counterfactual.

## What would make this only half an answer

The counterfactual "zero rollovers score 0" is itself a design choice, not a proven-correct
rule: a real human typing a short, deliberate passage can legitimately produce zero
rollovers, so forcing 0 would penalise them. This experiment measures the size of the free
score, not whether removing the abstention is safe for humans — that is Exp C's job (the
widened human false-positive rate) and, if it becomes a code change, `/cadence:build`'s.
