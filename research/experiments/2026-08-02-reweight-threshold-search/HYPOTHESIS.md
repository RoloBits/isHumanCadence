# Hypothesis — no weight or threshold separates the metric-aware forger from real humans

The prior candidate search
(`research/experiments/2026-08-02-zero-rollover-abstention-candidates/`) closed most of the
gap for bots that abstain on rollover (candidate B drops gaussianBot's median from 0.7186 to
0.6457). But every bot it tested emits `rollovers: 0`. The forgeability ladder
(`research/experiments/2026-08-02-metric-forgeability-ladder/`) shows the next attacker up —
forger 5, the metric-aware forger that injects ~25% rollovers and ~7% corrections — scores a
**median 0.8498, human on 30/30 seeds**, matching the real-human distribution on every one of
the six metrics.

**Hypothesis:** searching weight vectors and the classification threshold against a bot set
that includes the metric-aware forger and a human set of real CMU windows, **no configuration
lowers the metric-aware forger's false-negative rate below ~0.9 without pushing the real-human
false-positive rate above the baseline 0.167** (the CMU fraction below 0.70). Reweighting can
only move a bot the metrics disagree with humans on; the metric-aware forger agrees with them
everywhere, so only the threshold moves it — and the threshold trades one-for-one against real
humans, whose median is 0.80, barely above the forger's 0.85.

**Refutation:** any weight vector (with any zero-rollover / zero-correction treatment) that
gets the metric-aware forger FN at or below 0.5 while keeping CMU human FP at or below 0.167.
That would mean a metric the forger fails to fake exists in the current six.

## Method

- **Human set:** the 2,448 real CMU windows, mapped exactly as
  `research/experiments/2026-08-02-cmu-real-human-baseline/` (imported from its module).
- **Bot set:** 50 seeds each of gaussianBot (distribution-only, abstains on rollover) and
  forger 5, the metric-aware forger (log-normal flight+dwell, injected corrections+rollovers)
  reproduced from the ladder experiment. Reported separately, never pooled — they are
  different attacker tiers.
- **Rescoring:** the analyzer's composite is a weighted mean over non-abstaining metrics, so
  each sample's six metric values plus its abstention flags fully determine its score under
  any weight vector and any treatment of the abstaining metrics. Non-abstaining metric values
  are read from `analyze(...).metrics`; abstention is computed from inputs
  (`src/analyzer.ts:193,222,241`). A self-check asserts the reconstruction reproduces the
  shipped score under DEFAULT_WEIGHTS.
- **Configs:** baseline; candidate B (zero-rollover votes 0.5); up-weight rollover
  0.25→0.35 / flightFit 0.15→0.05; up-weight rollover + B; and a threshold sweep on baseline
  weights (0.70, 0.78, 0.82, 0.86).
- **Error rates** at each config: human FP = fraction of CMU windows below the threshold; bot
  FN = fraction of each forger at or above the threshold. Baseline (threshold 0.70): human FP
  0.167.
