# Hypothesis — the narrow human fixture hides a false-positive rate

`generateHumanLike` (`tests/fixtures/human-profiles.ts`) is one narrow model: flights
log-normal at median ~90 ms, dwells median ~35 ms, corrections 3-15%, rollover tied to
speed. Real typists span far more — from ~120 ms median flight (fast touch typists) to
~400 ms (hunt-and-peck), correction rates from near 0 to 15%+, and many slow typists produce
**no rollover at all**. The shipped weights and 0.70 threshold are tuned so the narrow
fixture always clears 0.70 (`research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/`
shows human min 0.7781). The open question is what happens at the edges of the real
population.

**Hypothesis:** a widened human generator spanning the population produces a non-trivial
fraction of synthetic humans that fall **below 0.70** (not confidently human), concentrated
among slow typists who also produce few rollovers — because slow typing plus zero rollover
strips the highest-weighted metric and pushes flight/dwell distributions toward the sigmoid
edges. A smaller fraction may cross below 0.35 (classified bot).

**Refutation:** essentially all widened humans still clear 0.70 (false-positive rate under
~2%), meaning the narrow fixture was not hiding an edge population.

## The evidence-ladder cap, stated up front

This is a **synthetic parameter sweep** — one rung above the in-repo fixtures, still far
below a real corpus. The ranges below are NOT extracted from a measured population. I tried
to pull dwell/flight/rollover population statistics from the Dhakal et al. Aalto project page
this session; the page states only qualitative findings ("rollover is surprisingly common",
"faster typists make fewer errors") and no numeric distributions, and I did not read the
paywalled/large PDF, so the numbers here are literature-informed engineering ranges, not
corpus values. Treat the resulting false-positive rate as an order-of-magnitude signal that
*motivates* getting a real corpus, never as the false-positive rate itself. Only the CMU
benchmark data or live browser capture settles the real number.

## Method

Widened human generator (seeded), drawing per-sample:
- **median flight** uniform in [120, 400] ms → log-normal `mu = ln(median)`, `sigma` in
  [0.4, 0.7].
- **median dwell** uniform in [25, 110] ms → log-normal, `sigma` 0.35.
- **correction rate** uniform in [0, 0.15].
- **rollover rate** tied to speed: fast typists (median flight < 180 ms) draw [0.15, 0.45];
  slow typists draw [0, 0.10], so a meaningful slice of slow typists get exactly 0 rollovers.
- occasional long pauses (~10% of flights) as the fixture does.

500 seeded samples, `count = 80`, `createAnalyzer({ weights: DEFAULT_WEIGHTS, minSamples: 20 })`.
Report: min/median/max score, fraction below 0.70 (false positive: not confidently human),
fraction below 0.35 (hard false positive: classified bot), and the same fractions split by
fast vs slow typist so the mechanism is visible.
