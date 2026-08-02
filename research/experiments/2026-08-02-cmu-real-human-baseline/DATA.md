# Data: DSL-StrongPasswordData.csv (CMU Killourhy-Maxion benchmark)

The real-human oracle for this repo. 51 subjects typing `.tie5Roanl` + Return, 8 sessions of 50
repetitions each — 20,400 rows, 34 columns. It is **not committed** (4.5MB, gitignored via
`research/**/*.csv`). Both `baseline.exp.ts` and `npm run bench` need it:

```
curl -sL -o research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv \
  "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"
```

Then `npx vitest run --config research/vitest.config.ts`, or `npm run bench`.

- Source: Killourhy & Maxion, "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics",
  DSN 2009 — <https://www.cs.cmu.edu/~keystroke/>. Freely redistributable; see
  `research/papers/killourhy-maxion-2009-ks-benchmark.md`.
- Shape verified 2026-08-02: 51 subjects, 20,400 rows, columns `H.*` (hold/dwell), `DD.*`
  (down-down), `UD.*` (up-down).
- **Mapping to `TimingData`:** `H.*` → dwell; `UD.*` → flight when `UD > 0`, else a rollover
  (a negative up-down means the next key went down before the previous came up). Seconds → ms.
- **Windowing:** 8 consecutive reps per (subject, session) → 88-keystroke windows, n = 2448. That
  windowing is what reproduces the recorded baseline exactly (min 0.4635, median 0.8044, 16.75%
  below 0.70). `bench.ts` and `baseline.exp.ts` both use it — change it and the numbers stop being
  comparable to everything already recorded in `research/`.
