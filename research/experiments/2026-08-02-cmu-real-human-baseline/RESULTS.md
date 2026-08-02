# Results — real-human baseline on the CMU keystroke corpus

**Verdict: confirmed** — median window score 0.8044 >= 0.70, and no window scores below
`unknownToBot` (0.35). But the distribution's left tail is the finding that matters.

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02 at repo HEAD `d4e0e92`, vitest 2.1.9, against
`DSL-StrongPasswordData.csv` (4,669,935 bytes, sha visible via
`shasum research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv`).
Literal output of this experiment's test:

```
RESULT cmuHumanWindows n=2448 min=0.4635 p05=0.6022 median=0.8044 p95=0.8863 max=0.9407 fracAtOrAbove0.70=0.833 fracBelow0.35=0.000
RESULT cmuSubjectMedians n=51 min=0.6795 p05=0.7013 median=0.8065 p95=0.8559 max=0.8648 fracAtOrAbove0.70=0.961 fracBelow0.35=0.000
RESULT cmuSubjectMins n=51 min=0.4635 p05=0.4990 median=0.6060 p95=0.7687 max=0.7966 fracAtOrAbove0.70=0.137 fracBelow0.35=0.000
METRIC dwellVariance median=0.9194 min=0.0017 max=0.9351
METRIC flightFit median=0.6774 min=0.0734 max=0.9042
METRIC timingEntropy median=0.9061 min=0.3103 max=0.9352
METRIC correctionRatio median=0.0000 min=0.0000 max=0.0000
METRIC burstRegularity median=0.6355 min=0.0000 max=1.0000
METRIC rolloverRate median=0.8929 min=0.0000 max=1.0000
ABSTAIN windows=2448 zeroRollover=646 burstAbstain=326 correctionAbstain=2448 (corpus has no corrections)
```

## What the numbers say

- **The real-human floor on this corpus is 0.4635**, and the 5th percentile is 0.6022.
  This is the hard constraint for every scoring-change candidate in this program: a
  change that pushes real windows below the floor is dead.
- **16.7% of real human 88-keystroke windows score below the 0.70 human threshold.**
  The synthetic human fixture never did (min 0.7781 over 50 seeds,
  `research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/RESULTS.md`). The
  in-repo human generator overstates how human real humans look to this analyzer.
- **Per subject:** 49 of 51 subjects have a median at or above 0.70; the lowest subject
  median is 0.6795. But half of all subjects dip below 0.61 in at least one window
  (median of per-subject minimums: 0.6060) — score-at-a-single-window is noisy even for
  genuine typists.
- **No real window scores below 0.35** — the current scoring never pushes a real human
  into the `bot` classification band on this corpus.
- **The score bands overlap irreparably at the score level:** gaussianBot (median
  0.7186) and replayBot (median 0.7671) from the fixture sweep sit inside the real-human
  interquartile range. And the HN attacker's reported 0.63
  (`research/papers/hn-2026-bobbiechen-attack.md`) is *above* the real-human p05 — a
  cutoff that rejects 0.63 also rejects more than 5% of real human windows.
- **Abstention is the normal case, not the corner case:** 26.4% of windows have zero
  rollovers, 13.3% abstain on burst regularity, and 100% abstain on corrections (the
  corpus has none by protocol). On a typical real window, at most 5 of 6 metrics vote,
  often only 4.

## Evidence-ladder rung

**Real corpus** — third rung, the first result in this repo above the synthetic rungs.
Caps that still apply:

- Fixed-text password typing (`.tie5Roanl`, 400 reps per subject) in a 2009 lab setting
  — practiced, short, repetitive. Free-text scores may differ in both directions.
- The corpus contains no corrections (error reps were discarded by protocol), so
  `correctionRatio` was never exercised.
- Flights never span repetition boundaries (no absolute timestamps in the CSV), so
  inter-rep pauses are missing and `burstRegularity` only sees within-password gaps.
- Rollover mapping counts only adjacent-pair overlap (`UD <= 0`); deeper overlap is
  invisible in the CMU features, so rollover may be undercounted relative to the live
  observer.
- This is still not the live pipeline: `analyze` was fed `TimingData` directly — no
  observer, no ring-buffer windowing, no hysteresis classifier.

## What this does not show

- Nothing about bots. This run scores only genuine typists; the bot side of the program
  still stands on the synthetic fixture rung.
- Nothing about free-text or long-form typing, corrections behaviour, or modern (2026)
  hardware/browser timing.
- Not that 0.70 is the right threshold — only what fraction of this corpus clears it.
