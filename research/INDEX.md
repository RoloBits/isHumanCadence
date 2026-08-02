# research/ index

One line per entry, newest last. Format:

```
<date>  <kind>   <path or link> — one-line summary
```

Kinds: `paper` (verified entry in papers/), `experiment` (directory in experiments/, with
its verdict), `lead` (a reference found but NOT verified this side of a fetch — no papers/
entry exists for it, and nothing may be cited from it until it is promoted).

## Entries

- 2026-08-02  paper       papers/dhakal-2018-typing-136m.md — the Aalto 136M/168K corpus behind DEFAULT_WEIGHTS; rollover is common and tied to speed
- 2026-08-02  paper       papers/killourhy-maxion-2009-ks-benchmark.md — CMU fixed-text benchmark, 51 subjects, best detector 9.62% EER, data freely rerunnable
- 2026-08-02  paper       papers/acien-2021-typenet.md — LSTM on the same Aalto corpus reaches 2.2% EER user-vs-user; upper bound on the timing signal
- 2026-08-02  paper       papers/shadman-2025-kd-survey.md — ACM Computing Surveys map of the field, 2025; dataset and method finder
- 2026-08-02  lead        Chu, Gianvecchio, Wang, Jajodia, "Blog or Block: Detecting Blog Bots Through Behavioral Biometrics", Computer Networks 2013, DOI 10.1016/j.comnet.2012.10.005, <https://www.eecis.udel.edu/~hnw/paper/comnet13.pdf> — UNVERIFIED: PDF fetched but not readable in this session; only the DOI was confirmed from its metadata. Promote after an actual read.
- 2026-08-02  experiment  experiments/2026-08-02-bot-fixtures-vs-human-threshold/ — verdict: refuted — gaussianBot median 0.7186 and replayBot median 0.7671 score above the 0.70 human threshold on in-repo fixtures
- 2026-08-02  paper       papers/hn-2026-bobbiechen-attack.md — primary attack report: HN user bobbiechen scripted AI keystrokes past the live library, 0.45 basic and 0.63 (human, confident) with the 5 metrics known
- 2026-08-02  paper       papers/rahman-2013-snoop-forge-replay.md — TIFS 2013 (skimmed, abstract-level): snoop-forge-replay forges keystroke latencies from 50-200 snooped keys, up to 87.75% success vs 4 verifiers; the peer-reviewed form of the HN attack
- 2026-08-02  lead        Wahab, Hou et al., "Towards liveness detection in keystroke dynamics: Revealing synthetic forgeries", 2022 (surfaced via search, DOI unconfirmed) — UNVERIFIED: not fetched or read this session. Relevant to detecting synthetic keystroke forgeries; promote after an actual read.
- 2026-08-02  experiment  experiments/2026-08-02-cmu-real-human-baseline/ — verdict: confirmed — real CMU humans median 0.8044, but the real-human floor is 0.4635 (p05 0.6022) and 16.7% of windows fall below 0.70; the hard constraint every candidate must respect
- 2026-08-02  experiment  experiments/2026-08-02-zero-rollover-abstention-candidates/ — verdict: A refuted, C refuted, B confirmed — voting zero rollovers as 0.5 (B) keeps every real window above the 0.4635 floor and drops both bot medians below 0.70, at a cost of 7.4pts of real-human >=0.70 headroom; replay only half-closed
- 2026-08-02  field       field-reports/2026-08-02-hn-forgery-critique.md — working note on the bobbiechen HN attack; the only live-browser data point in research/, self-reported and unreproducible
- 2026-08-02  experiment  experiments/2026-08-02-metric-forgeability-ladder/ — verdict: confirmed — a metric-aware forger reaches 0.8498 (30/30 confident), ABOVE the human control 0.8431; correctionRatio 0->0.97 and rolloverRate 0->1.00 by injecting events, so the two cheapest-to-fake metrics carry 0.35 of the weight
- 2026-08-02  experiment  experiments/2026-08-02-rollover-abstention-hole/ — verdict: confirmed — a zero-rollover bot keeps 0.19-0.24 of score via abstention (gaussianBot medDrop 0.2395, replayBot 0.2131); human median untouched, but the naive fix costs real humans (see candidates)
- 2026-08-02  experiment  experiments/2026-08-02-widened-human-false-positive/ — verdict: confirmed — 14.6% of a widened human population falls below 0.70, concentrated in slow typists (18.9%) vs fast (0.0%); no hard FP below 0.35
- 2026-08-02  experiment  experiments/2026-08-02-reweight-threshold-search/ — verdict: no win exists — the metric-aware forger passes at FN=1.000 under every weight vector; only the threshold touches it, and thr=0.82 catching 40% of forgers rejects 59% of real humans
- 2026-08-02  synthesis   2026-08-02-detection-improvement-synthesis.md — ranks the actions by measurement: #1 widen the human test fixture (real-human FP is the priority error, no forgery tradeoff, build now), #2 candidate B only if the +7.4pt human-FP cost is accepted, #3 narrow the README claim — the code-aware forger is structurally unreachable (FN=1.000 under every weight)
