# Results — metrics differ in how cheaply they can be forged

**Verdict: confirmed.**

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02, vitest 2.1.9. Literal output of the ladder (the six `RESULT` lines from this
experiment's file):

```
RESULT 1_constant medFinal=0.1386 reachHuman=0/30 | dwellVariance=0.08 flightFit=0.35 timingEntropy=0.02 correctionRatio=0.00 burstRegularity=0.00 rolloverRate=0.00
RESULT 2_gaussianJitter medFinal=0.7170 reachHuman=20/30 | dwellVariance=0.86 flightFit=0.56 timingEntropy=0.73 correctionRatio=0.00 burstRegularity=0.00 rolloverRate=0.00
RESULT 3_logFlights medFinal=0.5739 reachHuman=0/30 | dwellVariance=0.08 flightFit=0.69 timingEntropy=0.85 correctionRatio=0.00 burstRegularity=0.25 rolloverRate=0.00
RESULT 4_logFlightsDwell medFinal=0.7713 reachHuman=24/30 | dwellVariance=0.85 flightFit=0.69 timingEntropy=0.85 correctionRatio=0.00 burstRegularity=0.25 rolloverRate=0.00
RESULT 5_metricAware medFinal=0.8498 reachHuman=30/30 | dwellVariance=0.85 flightFit=0.69 timingEntropy=0.85 correctionRatio=0.97 burstRegularity=0.25 rolloverRate=1.00
RESULT 0_humanControl medFinal=0.8431 reachHuman=30/30 | dwellVariance=0.84 flightFit=0.66 timingEntropy=0.84 correctionRatio=0.95 burstRegularity=0.67 rolloverRate=1.00
```

## Numbers

Per-metric mean score across 30 seeds, `count = 80`, `createAnalyzer({ weights:
DEFAULT_WEIGHTS, minSamples: 20 })`.

| forger | medFinal | reachHuman | dwellVar | flightFit | timingEnt | corrRatio | burstReg | rolloverRate |
|---|---|---|---|---|---|---|---|---|
| 1 constant | 0.1386 | 0/30 | 0.08 | 0.35 | 0.02 | 0.00 | 0.00 | 0.00 |
| 2 gaussianJitter | 0.7170 | 20/30 | 0.86 | 0.56 | 0.73 | 0.00 | 0.00 | 0.00 |
| 3 logFlights | 0.5739 | 0/30 | 0.08 | 0.69 | 0.85 | 0.00 | 0.25 | 0.00 |
| 4 logFlightsDwell | 0.7713 | 24/30 | 0.85 | 0.69 | 0.85 | 0.00 | 0.25 | 0.00 |
| 5 metricAware | 0.8498 | 30/30 | 0.85 | 0.69 | 0.85 | 0.97 | 0.25 | 1.00 |
| 0 humanControl | 0.8431 | 30/30 | 0.84 | 0.66 | 0.84 | 0.95 | 0.67 | 1.00 |

Ranked per-metric gap, human control minus forger 4 (the distribution-only forger) — the
deliverable the hypothesis asked for:

| metric | human | forger 4 | gap (human − forger) | weight |
|---|---|---|---|---|
| rolloverRate | 1.00 | 0.00 | **+1.00** | 0.25 |
| correctionRatio | 0.95 | 0.00 | **+0.95** | 0.10 |
| burstRegularity | 0.67 | 0.25 | +0.42 | 0.15 |
| flightFit | 0.66 | 0.69 | −0.03 | 0.15 |
| timingEntropy | 0.84 | 0.85 | −0.01 | 0.20 |
| dwellVariance | 0.84 | 0.85 | −0.01 | 0.15 |

## Verdict, in words

The ranking hypothesis is **confirmed**. `rolloverRate` and `correctionRatio` separate the
distribution-only forger from the human by the largest margin (+1.00 and +0.95), while
`flightFit`, `timingEntropy` and `dwellVariance` do not separate them at all — forger 4
matches or slightly exceeds the human on all three, because those three are pure distribution
fits and the forger draws its flights and dwells from the same log-normal family the human
fixture uses. There is no refutation: faking the distributions *is* enough to pass the
distribution metrics.

The load-bearing finding is the escalation to forger 5. The two metrics that separate best
are also the two an attacker fakes by *injecting events with no timing craft at all*:
`correctionRatio` goes 0.00 → 0.97 and `rolloverRate` goes 0.00 → 1.00 purely by emitting
some corrections (~7%) and some rollovers (~25%) with human-typical values. Those two metrics
carry 0.10 + 0.25 = **0.35 of the default weight** (`src/analyzer.ts:24,26`). Setting them to
human-typical lifts the forger from medFinal 0.7713 (24/30 reaching human) to **0.8498, 30/30
human and confident — above the human control's 0.8431**. The metric that discriminates best
is the metric that is cheapest to forge, because it scores the presence of an event, not the
craft of its timing.

This corroborates the bobbiechen HN field report
(`research/field-reports/2026-08-02-hn-forgery-critique.md`,
`research/papers/hn-2026-bobbiechen-attack.md`), which reached 0.63 human+confident with a
targeted script. This experiment exceeds that figure (0.85) for the same class of attack, and
the reason is structural: the package is open source, so the forger here reads the six metric
names and their weights directly from `src/analyzer.ts` rather than probing them blind.

## Evidence-ladder rung

**Synthetic forgers vs a synthetic human control** — one rung above the in-repo fixture
sweep, still below a real corpus. Every input is generated: the forgers are hand-built in
`ladder.exp.ts` and the control is `generateHumanLike`, both written to this repo's own model
of a human. This is evidence about the **forgeability of the metric definitions** — how much
score a given metric hands to an input constructed to satisfy it — not a real-world capture
rate. It does not measure how often a real automation framework produces these inputs, nor
whether a real human's `burstRegularity` (0.67 here, the one metric the forger underscores on
at 0.25) reliably separates them; a real corpus is needed for that, and
`research/experiments/2026-08-02-cmu-real-human-baseline/` is the higher rung to read next.

## What this does not show

- Nothing about real bots or real humans — every row is synthetic, and the forgers were
  written against the same `src/analyzer.ts` they are scored by.
- Nothing about the full pipeline: `analyze` was fed `TimingData` directly. medFinal is the
  raw score, not the Schmitt-trigger `classification`, which also depends on state history
  (`src/index.ts:12-27`). "30/30 reaching human" is 30/30 raw scores at or above 0.70, not 30
  live sessions flipping to `human`.
- It does not show that up-weighting `rolloverRate`/`correctionRatio` would help — the
  opposite is arguable, since those are the cheapest to inject. Nor that they should be
  down-weighted. That is a weights question and a product judgment for `api-steward`; if it
  becomes a code change it routes through `/cadence:build` with this file attached.
- burstRegularity (human 0.67 vs forger 0.25) is the one metric the event-injecting forger
  did not close. Whether it holds under a forger that also spaces its keystrokes to fake burst
  cadence is a follow-up this experiment did not run.
