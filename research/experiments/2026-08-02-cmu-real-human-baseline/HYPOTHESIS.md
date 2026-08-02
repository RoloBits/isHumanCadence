# Hypothesis

Real human typing — the CMU keystroke benchmark (Killourhy & Maxion, DSN 2009;
`research/papers/killourhy-maxion-2009-ks-benchmark.md`), 51 subjects typing
`.tie5Roanl` 400 times each — scores at or above
`DEFAULT_CLASSIFICATION_THRESHOLDS.unknownToHuman` (0.70, `src/index.ts:8`) at the median
when fed through `createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 })` in
88-keystroke windows.

Refutation: a median window score below 0.70. Secondary refutation (worse): any
non-trivial mass (>5% of windows) below `unknownToBot` (0.35) — real humans being
classified toward bot.

Whatever the verdict, the run establishes the number this research program treats as the
hard constraint: the **real-human floor** — the minimum and low percentiles of the score
distribution on real typing. Every scoring-change candidate is dead if it pushes real
human windows below that floor.

## Method

- Data: `DSL-StrongPasswordData.csv` (4,669,935 bytes, fetched 2026-08-02 from
  <https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv>), 20,400 rows = 51
  subjects x 8 sessions x 50 repetitions; 11 hold times (`H.*`), 10 keydown-keydown
  (`DD.*`), 10 keyup-keydown (`UD.*`) per row, in seconds.
- Mapping to this repo's `TimingData` (semantics matched to `src/observer.ts`):
  - `dwells` = all `H.*` values x 1000 (ms).
  - `flights` = `UD.*` x 1000 where `UD > 0` — the observer records a flight only when
    the new key does not overlap the previous one (`src/observer.ts:101`).
  - `rollovers` = count of `UD <= 0` — next keydown before previous keyup, the same
    condition the observer counts (`src/observer.ts:96-97`). Only adjacent-pair overlap
    is visible in the CMU features; deeper overlap (a key held across two later keys)
    is invisible, so this can undercount rollovers relative to the live observer.
  - `corrections` = 0. The benchmark protocol discarded erroneous repetitions, so the
    corpus contains no backspaces. `correctionRatio` therefore abstains (`NO_DATA`,
    `src/analyzer.ts:193`) on every window — a known mapping limitation, but also
    realistic for short error-free input.
  - `total` = 11 keystrokes per repetition x reps per window.
- Windowing: per subject x session, repetitions sorted, non-overlapping chunks of 8 reps
  = 88 keystrokes (near the 80 used by the fixture sweep). First 48 of 50 reps used ->
  6 windows per session, 2,448 windows total. Flights never span repetition boundaries
  (the CSV has no absolute timestamps), so inter-rep pauses are absent — burst gaps
  (>300 ms) can only occur inside a repetition.
- Scoring: `analyze(dwells, flights, corrections, rollovers, total)` per window, exactly
  as the fixture sweep did.
- Reported: n, min, p05, median, p95, max, fraction >= 0.70, fraction < 0.35; abstention
  counts per metric; per-metric median scores; and the same stats per subject (51
  medians) so a single unusual subject cannot hide in the pooled distribution.

## Honesty note

Before this file was written, a structural pass over the CSV (no scoring) was run to
confirm the format: it found 10.8% of transitions are rollovers and **646 of 2,448
windows (26.4%) contain zero rollovers**. No score had been computed when this hypothesis
was written. The zero-rollover fraction is recorded here because it already constrains
the follow-up candidate experiment, whatever this baseline shows.
