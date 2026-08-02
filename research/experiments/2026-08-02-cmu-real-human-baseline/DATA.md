# Data: DSL-StrongPasswordData.csv

`baseline.exp.ts` needs the CMU Keystroke Dynamics benchmark, which is **not
committed** — it is 4.5MB and gitignored (`research/**/*.csv`). Fetch it before
running the experiment:

```
curl -sL -o research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv \
  "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"
```

Then: `npx vitest run --config research/vitest.config.ts`.

- Source: Killourhy & Maxion, "Comparing Anomaly-Detection Algorithms for
  Keystroke Dynamics", DSN 2009 — <https://www.cs.cmu.edu/~keystroke/>. Freely
  redistributable; see `research/papers/killourhy-maxion-2009-ks-benchmark.md`.
- Shape verified 2026-08-02: 51 subjects, 20,400 rows, 34 columns
  (`H.*` hold/dwell, `DD.*` down-down, `UD.*` up-down/flight) for the fixed
  password `.tie5Roanl`.
- Mapping to `TimingData`, per `baseline.exp.ts`: `H.*` → dwell, `UD.*` →
  flight when `UD > 0` else rollover. 2,448 real 88-keystroke windows scored.
