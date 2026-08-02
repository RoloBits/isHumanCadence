# Results — no weight vector or threshold catches a metric-aware forger without destroying human FP

**Verdict: the search failed to find a win, and that failure is the finding.** Against a forger
that knows the five metrics, `metricAwareFN` stays at **1.000** under every weight configuration
tested. The only lever that moves it is raising the classification threshold, and every threshold
that catches the forger flags a catastrophic fraction of real humans.

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02, vitest 2.1.9. Bot sets: `gaussianBot` (a naive forger) and `metricAware` (a
forger that injects corrections and rollover — the bobbiechen-style attacker). Human set: the 2,448
real CMU windows. `humanFP` = fraction of real humans below the threshold; `FN` = fraction of that
bot reaching human-or-above.

```
RESULT baseline       thr=0.70 humanFP=0.167 gaussianFN=0.680 metricAwareFN=1.000
RESULT B_zeroRoll=0.5 thr=0.70 humanFP=0.241 gaussianFN=0.020 metricAwareFN=1.000
RESULT upRollover     thr=0.70 humanFP=0.160 gaussianFN=0.920 metricAwareFN=1.000
RESULT upRollover+B   thr=0.70 humanFP=0.289 gaussianFN=0.000 metricAwareFN=1.000
RESULT thresholdSweep thr=0.70 humanFP=0.167 gaussianFN=0.680 metricAwareFN=1.000
RESULT thresholdSweep thr=0.78 humanFP=0.386 gaussianFN=0.160 metricAwareFN=0.920
RESULT thresholdSweep thr=0.82 humanFP=0.590 gaussianFN=0.000 metricAwareFN=0.600
RESULT thresholdSweep thr=0.86 humanFP=0.821 gaussianFN=0.000 metricAwareFN=0.400
```

## What it shows

- **The metric-aware forger is untunable.** `metricAwareFN = 1.000` at baseline, with candidate B,
  with up-weighted rollover, and with both. Reweighting the metrics cannot catch a forger that
  satisfies every metric — because it satisfies every metric. This is the quantified form of the
  structural conclusion: the metrics are open source, and anything the score rewards, the forger
  supplies.
- **Weight changes only touch the naive forger.** Candidate B drops `gaussianFN` 0.680 → 0.020;
  `upRollover+B` reaches 0.000. But both raise `humanFP` (0.167 → 0.241, → 0.289). You buy naive-bot
  separation with real-human false positives, and the smart forger walks through untouched.
- **The threshold is the only lever with any effect on the smart forger, and it is
  catastrophic.** To pull `metricAwareFN` from 1.000 down to 0.600 you raise the threshold to 0.82,
  where `humanFP = 0.590` — three in five real humans denied. At 0.86 you catch 60% of forgers and
  reject 82% of humans. There is no operating point where the forger is caught and humans are not.

## Evidence-ladder rung

**Real humans (CMU) vs synthetic forgers.** The human false-positive numbers are on the real corpus
— the strongest rung available. The forger false-negative numbers are synthetic: they measure the
forgeability of the metric *definitions*, not a captured real-world attack rate. The `metricAware`
generator is this repo's model of what bobbiechen described; the HN field report
(`../../papers/hn-2026-bobbiechen-attack.md`) is the one real data point, and it agrees in
direction.

## What it does not show

That the library is worthless. It catches the naive forgers (`gaussianFN` and the constant/uniform
bots are separable), and the HN critic conceded it "still helps against drive-by attackers." What
it shows is the ceiling: a client-side timing score cannot be tuned to catch an adversary who reads
the code, and the attempt costs real humans. The product decision that follows — narrow the claim,
or add a signal outside the client — is `api-steward`'s, not this experiment's.
