# Results — bot fixtures vs the 0.70 human threshold

**Verdict: refuted.**

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02 at repo HEAD `d4e0e92`, vitest 2.1.9. Literal output of the sweep:

```
RESULT human n=50 min=0.7781 median=0.8434 max=0.8843 fracAtOrAbove0.70=1.00
RESULT constantBot n=50 min=0.1386 median=0.1386 max=0.1386 fracAtOrAbove0.70=0.00
RESULT randomJitterBot n=50 min=0.5154 median=0.5669 max=0.5944 fracAtOrAbove0.70=0.00
RESULT gaussianBot n=50 min=0.6408 median=0.7186 max=0.8037 fracAtOrAbove0.70=0.68
RESULT replayBot n=50 min=0.6990 median=0.7671 max=0.8220 fracAtOrAbove0.70=0.98
```

## Numbers

| generator | n | min | median | max | fraction >= 0.70 |
|---|---|---|---|---|---|
| human | 50 | 0.7781 | 0.8434 | 0.8843 | 1.00 |
| constantBot | 50 | 0.1386 | 0.1386 | 0.1386 | 0.00 |
| randomJitterBot | 50 | 0.5154 | 0.5669 | 0.5944 | 0.00 |
| gaussianBot | 50 | 0.6408 | 0.7186 | 0.8037 | 0.68 |
| replayBot | 50 | 0.6990 | 0.7671 | 0.8220 | 0.98 |

`constantBot` ignores its seed, so its 50 runs are identical by construction.

## Verdict, in words

The hypothesis — every bot generator's median stays below
`DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman` (0.70) — is **refuted** for two of the
four bot generators. `gaussianBot`'s median is 0.7186 with 68% of seeds at or above the
threshold; `replayBot`'s median is 0.7671 with 98% at or above it. The informal seed-42
probe was not an outlier; it was the typical case. `constantBot` and `randomJitterBot` sit
well below the threshold, and the humans clear it on every seed.

Note the overlap: `gaussianBot`'s max (0.8037) is above the human min (0.7781). The
suite's per-seed ordering assertions can still hold — on a shared seed the human usually
scores higher — but there is no clean margin between the distributions.

A mechanism worth naming (read from `src/analyzer.ts:241` and `:193`, not measured
separately): all four bot generators emit `corrections: 0` and `rollovers: 0`, which
returns the `NO_DATA` sentinel, and `NO_DATA` metrics abstain — their weight redistributes
instead of counting against the score. So `rolloverRate`, the highest-weighted metric
(0.25), never votes on any bot fixture. For `replayBot`, whose dwells and flights are a
human's by construction, the only remaining discriminators are metrics on which it *is*
human.

## Evidence-ladder rung

**In-repo fixtures** — the bottom rung. This is a fact about the pair
(`tests/fixtures/bot-profiles.ts`, threshold 0.70), not about bots or humans. Two readings
are consistent with it and this experiment cannot pick between them:

1. **Detection gap** — the analyzer under-penalises Gaussian-jittered and replayed timing,
   partly because the `NO_DATA` abstention removes the zero-rollover signal.
2. **Fixtures too human-like** — `generateGaussianBot`'s spread (sigma 15/30 ms) and a
   verbatim human replay may be harder inputs than real-world bots produce, so the
   fixtures overstate the problem.

Undecided. Deciding it needs a higher rung: a real typing corpus (the CMU benchmark data
is a candidate — see `research/papers/killourhy-maxion-2009-ks-benchmark.md`) or live
browser capture of actual automation (Playwright typing into the demo).

## What this does not show

- Nothing about real humans or real bots — every input is synthetic and written by the
  same hand as the metrics being scored.
- Nothing about the full pipeline: `analyze` was fed `TimingData` directly. No observer,
  no windowing, no Schmitt-trigger classifier — a score of 0.72 does not mean the live
  `classification` flips to `human`, because that also depends on the state history
  (`src/index.ts:12-27`).
- Nothing about the weights being wrong. The same sweep under different weights or a
  non-abstaining treatment of zero rollovers would be the follow-up experiment, and it
  routes through `/cadence:build` if it ever becomes a code change.
