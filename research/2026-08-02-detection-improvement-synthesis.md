# Synthesis — how to improve detection without calling humans bots

2026-08-02. Reads the seven experiments and the HN field report together and ranks what to do.
Every number here is reproduced from a `RESULTS.md` in this tree; nothing new is measured.

## The one conclusion the data forces

**You cannot tune this library to stop an adversary who reads the code, and trying costs real
humans.** The reweight search settles it: the metric-aware forger passes at `metricAwareFN = 1.000`
under every weight vector tried, and the only lever that touches it — the threshold — flags 59% of
real humans (`humanFP = 0.590`) at the point it first catches 40% of forgers
(`experiments/2026-08-02-reweight-threshold-search/`). The library is MIT and open, so the forger
knows exactly what the score rewards and supplies it. This is not a defect to fix; it is the shape
of client-side timing scoring, and `browser-expert` said so before any of this ran.

So the goal splits cleanly:

- **Against drive-by / naive automation** — the library works, and can work a bit better. Worth doing.
- **Against a motivated, code-reading adversary** — unreachable by tuning. The honest move is to
  narrow the claim, not chase the number.

## What we now know, in numbers

| Finding | Number | Source |
|---|---|---|
| Real humans have a low tail the fixture hides | median 0.8044, but **16.7% below 0.70**, floor 0.4635 | cmu-real-human-baseline |
| The tail is slow, even typists | slowTypists 18.9% below 0.70; fastTypists 0.0% | widened-human-false-positive |
| A code-aware forger beats real humans | **0.8498, 30/30 confident** vs human control 0.8431 | metric-forgeability-ladder |
| The most-weighted metrics are the cheapest to fake | correctionRatio 0→0.97, rolloverRate 0→1.00 by injecting events | metric-forgeability-ladder |
| Not faking rollover is also free | zero-rollover bots keep 0.19–0.24 of score via abstention | rollover-abstention-hole |
| No weight vector catches the smart forger | metricAwareFN = 1.000 everywhere | reweight-threshold-search |
| The naive rollover fix backfires on humans | candidate A pushes 14 real humans below the floor | zero-rollover-abstention-candidates |

## Ranked actions

Ranked by (evidence strength × effect) ÷ cost. Each says: build now, or finding only, and the route.

### 1. Narrow the README claim to what the evidence supports — **build now, route: `/cadence:build` (docs)**
The strongest, cheapest, safest action, and the only one that touches the code-aware forger — by
not claiming to stop it. The library is a **drive-by filter**, not an adversary defense; the HN
critic conceded exactly that. Say so: it raises the cost of casual automation and gives a
behavioural signal, and a motivated attacker who reads the client can defeat it. This is a `docs:`
change (publishes nothing) and it closes the gap between the marketing and the measurements. `f9fab4b`
already showed this repo ships claims ahead of reality; this is the same fix, pointed at the README.

### 2. Down-weight the trivially-injectable metrics — **finding, route: `api-steward` then `/cadence:build`**
`correctionRatio` (0.10) and `rolloverRate` (0.25) move from 0 to ~1.0 by injecting events — 0.35 of
the weight bought for free by a forger. Shifting weight toward `flightFit` and `timingEntropy` (the
two that need actual distributional realism) raises the naive-forger cost. **But:** it does nothing
to the metric-aware forger (it fakes those too, just less cheaply), and it is a user-observable score
change — a `feat:` at least, `BREAKING CHANGE` if a consumer tuned thresholds (see `releasing`
skill). Needs `api-steward` to own the semver call, and re-validation on the real corpus, not the
fixtures.

### 3. Fix the zero-rollover abstention hole — candidate B only — **finding, route: `api-steward`**
Voting a zero-rollover bot at 0.5 instead of abstaining drops gaussianBot 0.719→0.646 and replayBot
0.767→0.693, and keeps every real CMU window above the floor. **The honest costs, both measured:** it
only half-closes replay (30% of replay seeds still pass), and it moves 7.4 points of real humans out
of confident-human (`fracAtOrAbove0.70` 0.833→0.759). A real improvement against naive bots with a
real human cost — a genuine tradeoff for `api-steward`, not a free win. Candidates A and C are dead
(they push 14 and 76 real humans below the floor).

### 4. Protect the slow-typist tail — **finding, needs design**
18.9% of slow-even typists fail confident-human today, and every action above that separates bots
better makes this worse. Any change in actions 2–3 must be measured against the CMU slow tail, not
the fixture. This is the counterweight that keeps "better detection" from meaning "reject more real
people." No concrete change yet — it is the constraint the others answer to.

### 5. The only structural defense is a signal off the client — **finding, `api-steward` + `browser-expert`**
Server-side verification, a proof-of-work, or a signed timing record the client cannot forge. This is
a different product with a different threat model and it breaks the zero-dependency, client-only,
`<3KB` stance — so it is a question about a *new package*, not a new option. Out of scope for a tuning
pass; recorded so it is not rediscovered.

## The methodological finding, worth keeping

Every candidate looked free when measured on `tests/fixtures/` — the synthetic human always emits
rollovers, so it never touches the changed branch. The real CMU corpus is what exposed the
7.4-point human cost. **This repo's own fixtures cannot price a detection change.** The CMU baseline
(or a real capture) has to be the oracle for anything that moves the score. That is the single most
important process change this program produced, and it argues for getting a real corpus into the
`/cadence:evidence` loop, not just this one experiment.
