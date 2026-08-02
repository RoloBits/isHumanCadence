# Synthesis — improving bot detection without classifying humans as bots

Date: 2026-08-02. Repo HEAD `4a120da`. This ranks the concrete improvements that the
2026-08-02 experiments produced, against the two error types that pull against each other:

- **False positive** — a real human not confidently `human` (or classified `bot`). The
  developer's stated priority. Do not regress it.
- **False negative** — a bot scored `human`. What bobbiechen demonstrated live
  (`research/field-reports/2026-08-02-hn-forgery-critique.md`).

## The honest ceiling, stated once for all of it

No client-side timing library beats an adversary who owns the client. `browser-expert` holds
this position in the repo and the reweight search proved the scoring half of it: against a
forger that reads the six metric names from the open-source `src/analyzer.ts` and sets each
input human-typical, **the false-negative rate is 1.000 under every weight vector tested**
(`research/experiments/2026-08-02-reweight-threshold-search/`). The only lever that moves that
forger is the classification threshold, and catching it (threshold 0.82) rejects **59% of real
CMU humans**. So the goal here was never unforgeability. It is: (1) close holes that make
forgery cheap, (2) weight hard-to-fake signals over easy ones, (3) do not raise the human
false-positive rate. The measurements below are graded on those three, not on stopping a
determined attacker — nothing in the six metrics does that.

## What the four experiments measured

| experiment | rung | headline |
|---|---|---|
| rollover-abstention-hole (A) | fixtures | zero-rollover abstention hands gaussian/replay bots 0.21-0.24 of score; it is the only thing holding both above 0.70 |
| metric-forgeability-ladder (B) | synthetic | `rolloverRate`/`correctionRatio` separate a distribution forger best (+1.00/+0.95) but are the cheapest to fake by event injection; a metric-aware forger hits 0.85, above the human control |
| widened-human-false-positive (C) | synthetic | 14.6% of widened synthetic humans fall below 0.70, 18.9% of slow typists; echoes CMU's 16.7% |
| reweight-threshold-search (D) | real humans + synthetic bots | no weight vector catches the metric-aware forger (FN 1.000); threshold that catches it rejects 59-82% of real humans |

Prior real-corpus work these build on: `research/experiments/2026-08-02-cmu-real-human-baseline/`
(16.7% of real humans below 0.70, floor 0.4635) and
`research/experiments/2026-08-02-zero-rollover-abstention-candidates/` (candidate B, zero-roll
votes 0.5, is the only abstention fix that keeps every real window above the floor).

## Ranked improvements

Ranked by (evidence strength × impact on the two error rates ÷ forgery-cost-raised). **This
ranking deviates from the prediction that "fix the rollover hole and the re-weight are the top
two."** The re-weight search *failed* — no weight vector wins (D). And the rollover fix is
weaker than predicted: it raises human false positives and does nothing to the real threat. The
measured top item is on the human side, which is the stated priority.

### 1. Widen the human test fixture; treat the real-human sub-0.70 rate as the priority metric. BUILD NOW.

- **Evidence:** strongest available — real corpus. 16.7% of real CMU human windows score below
  0.70 (`cmu-real-human-baseline`), independently echoed at 14.6% by the widened synthetic sweep
  (C), both concentrated in slow typists.
- **Impact:** directly on the developer's priority error. `generateHumanLike` is a single fast
  typist (median flight ~90 ms, always `rollovers > 0`) and never dips below 0.7781, so the test
  suite is blind to the ~1-in-6 real humans who are not confidently human on their first window —
  and blind to human-FP regressions (candidate A slipped 14 real windows below the floor while
  the fixture showed zero cost, `zero-rollover-abstention-candidates`).
- **Forgery cost raised:** none — this is a test-fixture and evaluation change, not a scoring
  change. That is why it ranks first: pure priority-error protection with no tradeoff.
- **Route:** `/cadence:build` as a **test** change (adding slow/zero-rollover/correction human
  fixtures is confined to `tests/` — must not be `feat:`/`fix:`, per the releasing skill). The
  RESULTS files are the evidence. Widening the fixture is safe now; whether to also move the 0.70
  threshold or lean harder on hysteresis for slow typists is an `api-steward` call.

### 2. Close the rollover abstention for the lazy/replay tier (candidate B: zero-rollover votes 0.5). BUILD ONLY IF THE HUMAN COST IS ACCEPTED — needs api-steward.

- **Evidence:** both sides measured — real corpus for the human cost, fixtures for the bot
  benefit.
- **Impact:** the only measured lever that lowers bot FN at all. Drops gaussianBot FN 0.680 →
  0.020 and pulls replay's median below 0.70 (A, D). **But it raises real-human FP from 0.167 to
  0.241** (D) — a 7.4-point regression on the stated-priority error — and does **nothing** to the
  metric-aware forger (FN stays 1.000, D), because that forger emits rollovers and never triggers
  the abstention.
- **Forgery cost raised:** only against attackers who leave `rollovers: 0` — the drive-by tier
  and naive replay. Zero against anyone who read the code.
- **Route:** `/cadence:build` with `zero-rollover-abstention-candidates/RESULTS.md` and D as
  evidence. This is a user-observable scoring change — every consumer's distribution moves — so
  it is at least a `feat:` and an `api-steward` semver call (the releasing skill: a weight/behaviour
  retune is user-observable). The honest framing for that decision: B buys separation against the
  bots that are *already easiest to catch*, and charges real humans 7.4 points to do it. It is
  defensible only if catching drive-by/replay bots is worth that, and it must ship paired with
  item 1 so the human cost is visible in the suite.

### 3. Narrow the public claim and/or add an out-of-band signal — the six metrics cannot catch a code-reading adversary. FINDING (api-steward), no corpus needed.

- **Evidence:** decisive and already complete — metricAwareFN = 1.000 under baseline, candidate B,
  up-weighted rollover, and both (D); threshold to dent it is catastrophic for humans; the HN
  field report is the real-world confirmation (0.63 human+confident with the metrics known).
- **Impact:** this is the ceiling, not a tuning knob. No weighting inside the current six metrics
  separates a metric-aware forger from a real human, because the forger satisfies every metric the
  score rewards. The only ways to raise forgery cost further are outside this experiment's scope: a
  signal the attacker does not know to fake, or moving the verdict off the client (server-side
  verification, signed timing). Both break the zero-dependency / `<3KB` / no-network stance and are
  `api-steward`/`browser-expert` questions.
- **Route:** **finding**, not a build. The cheap honest step is a README change: the current claim
  invites reading the score as a verdict; the true statement is "raises cost against drive-by and
  replay bots; not a defence against an adversary who reads the client code." That is an
  `api-steward` decision about the product claim, with this synthesis as evidence.

## What still needs a real corpus before anything ships

- The **bot side is still synthetic** everywhere except the single self-reported HN data point.
  Candidate B "drops the bot median below 0.70" is a fact about `generateGaussianBot`/
  `generateReplayBot`, not about real automation. The next rung is live capture — Playwright/CDP
  typing into the demo — which `browser-expert` designs and this agent would run.
- The **human false-positive rate** is well-grounded on CMU (real, 16.7%) but CMU is 2009
  fixed-text password typing with no corrections and no slow/fast label. Free-text and modern
  hardware may move it either way. Item 1 is safe regardless (widening a fixture cannot make the
  suite less representative); item 2's exact human cost should be re-measured on a free-text corpus
  before it ships.

## One-line routing

- Item 1 → `/cadence:build` (test change), safe now.
- Item 2 → `api-steward` decision, then `/cadence:build` (semver change), paired with item 1.
- Item 3 → `api-steward` (product claim), no code experiment left to run.
