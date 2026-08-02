# Hypothesis

Background: the fixture sweep
(`research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/RESULTS.md`) named the
mechanism that lets replay and Gaussian bots cross 0.70 — all bot fixtures emit
`rollovers: 0`, `scoreRolloverRate` returns `NO_DATA` (`src/analyzer.ts:241`), and
`NO_DATA` abstains, so the highest-weighted metric (0.25) never votes on a bot. The
obvious fix is to make zero rollovers vote instead of abstain. The CMU baseline
(`research/experiments/2026-08-02-cmu-real-human-baseline/RESULTS.md`) now supplies the
hard constraint: **26.4% of real human windows also have zero rollovers**, and the
real-human floor is **0.4635** (p05 0.6022).

Three candidates, evaluated as post-hoc re-weightings of the recorded per-window scores
(exact algebra, no change to `src/`):

- **A — zero rollovers vote 0** (full bot penalty) when `total >= 10`.
- **B — zero rollovers vote 0.5** (neutral: the metric counts, but says "no signal").
- **C — zero rollovers vote 0 AND zero corrections vote 0** (the full "bots leave no
  secondary signals" penalty).

Hypothesis, per candidate:

1. **A is dead against the human floor.** A zero-rollover real window's score is
   multiplied by `W/(W+0.25)` (W = its active weight, 0.50-0.65), so windows near the
   current p05 fall to ~0.40-0.43 — below the 0.4635 floor. Refuted if no real window
   lands below the floor.
2. **C is dead a fortiori** — every CMU window has zero corrections, so C penalises 100%
   of real windows. Refuted if the corpus minimum somehow stays at or above the floor.
3. **B survives the floor by construction** — pulling a score toward 0.5 cannot produce
   a value below `min(current, 0.5)`, and the current floor is below 0.5 — **and** B
   drops the gaussianBot and replayBot medians below 0.70. Refuted if either bot median
   stays at or above 0.70, or (impossible by the algebra, checked anyway) any real
   window lands below the floor.

Also measured, because the floor is not the only human cost: the fraction of real human
windows at or above 0.70 under each candidate (baseline: 0.833). A candidate that keeps
the floor but strips many real humans of `>= 0.70` still pays a real price; that number
goes on the record for api-steward, not a pass/fail here.

## Method

- Populations: the 2,448 CMU windows (mapped exactly as the baseline experiment); the
  five fixture generators, 50 seeds each, count 80 (as the fixture sweep).
- Baseline score from `createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 })`.
- Variant scores by exact re-weighting: the analyzer's composite is a weighted mean over
  non-`NO_DATA` metrics, so adding a vote v with weight w to a score s whose active
  weight is W gives `(s*W + w*v)/(W + w)`. Abstention per window is computed from the
  inputs: corrections (`total>=5 && corrections===0`), rollover
  (`total>=10 && rollovers===0`), burst (`flights.length>=10` and fewer than 2 flights
  > 300 ms) — the same conditions as `src/analyzer.ts:193,222,241`.
- Self-check printed with the results: on windows where a candidate's target metrics did
  not abstain, the variant score must equal the baseline score exactly.
- Reported per population x candidate: min, p05, median, frac >= 0.70; for CMU also the
  count of windows below the 0.4635 floor.

## Honesty note

This hypothesis is written after the baseline run and states predictions derived from
its numbers (the multiplicative-drop arithmetic above). No variant score had been
computed when it was written.
