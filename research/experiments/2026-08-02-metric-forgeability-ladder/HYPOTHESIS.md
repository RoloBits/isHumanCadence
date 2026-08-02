# Hypothesis — metrics differ in how cheaply they can be forged

A forger escalating in sophistication passes the six metrics in a predictable order: the
metrics that only require the right marginal *distribution* of flight times collapse first
(cheap to fake), and the metrics that require modelling a second signal the attacker did not
snoop hold longest (expensive to fake). This is the mechanism behind Snoop-Forge-Replay
(`research/papers/rahman-2013-snoop-forge-replay.md`) and the bobbiechen attack
(`research/field-reports/2026-08-02-hn-forgery-critique.md`): once the attacker knows the
five metric names, the targeted script reached 0.63 human+confident.

**Hypothesis:** ranking the metrics by the score they hand a log-normal forger (forger 4,
which fakes flight and dwell distributions but injects no corrections or rollovers) versus a
real human, `rolloverRate` and `correctionRatio` separate them most, and `flightFit` /
`timingEntropy` / `dwellVariance` separate them least — because the first two need signals a
distribution-only forger does not produce, and the last three are pure distribution fits the
forger targets directly.

**Refutation:** the log-normal forger scores *below* the human threshold on the distribution
metrics too, i.e. faking the flight/dwell distribution is not enough to pass them — which
would mean those metrics are not cheap after all.

## Method

Five seeded forgers, escalating, built in the `.exp.ts`:
1. **constant** — reuse `generateConstantBot` (fixed 100 ms flights, 50 ms dwells).
2. **gaussian jitter** — reuse `generateGaussianBot` (normal jitter, narrow).
3. **log-normal flights** — flights drawn log-normal like the human fixture; dwells left
   constant; no corrections, no rollovers.
4. **log-normal flights + log-normal dwell** — both distributions faked; still no
   corrections, no rollovers.
5. **metric-aware forger** — forger 4 plus injected corrections (~7%) and injected rollovers
   (~25%), i.e. an attacker who read the five metric names and set every input to a
   human-typical value. This is the bobbiechen-class script.

For each forger, 30 seeds, `count = 80`, `createAnalyzer({ weights: DEFAULT_WEIGHTS,
minSamples: 20 })`. Report the mean of each of the six metric scores across seeds, the median
final score, and the fraction of seeds reaching the 0.70 human threshold. `generateHumanLike`
is the control row. The deliverable is a ranked table of per-metric score for forger 4 (human
minus forger) — the metrics with the largest gap are the ones to up-weight.
