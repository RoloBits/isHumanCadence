# Results — zero-rollover abstention candidates against the human floor

**Verdict: A refuted, C refuted, B confirmed** — B is the only candidate that keeps every
real human window at or above the 0.4635 floor while dropping both bot medians below 0.70.
B is a partial improvement, not a fix.

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02 at repo HEAD `d4e0e92`, vitest 2.1.9. CMU windows mapped exactly as
`research/experiments/2026-08-02-cmu-real-human-baseline/`; fixtures at 50 seeds, count 80.
Literal output:

```
SELFCHECK cmu nonAbstainingWindowsMoved=0 (expect 0)
RESULT cmu_baseline n=2448 min=0.4635 p05=0.6022 median=0.8044 fracAtOrAbove0.70=0.833 belowFloor(0.4635)=0
RESULT cmu_A n=2448 min=0.4034 p05=0.5274 median=0.7594 fracAtOrAbove0.70=0.586 belowFloor(0.4635)=14
RESULT cmu_B n=2448 min=0.4635 p05=0.5989 median=0.7675 fracAtOrAbove0.70=0.759 belowFloor(0.4635)=0
RESULT cmu_C n=2448 min=0.3631 p05=0.4741 median=0.6807 fracAtOrAbove0.70=0.436 belowFloor(0.4635)=76
RESULT human_baseline n=50 min=0.7781 p05=0.8039 median=0.8434 fracAtOrAbove0.70=1.000
RESULT human_A n=50 min=0.7781 p05=0.8039 median=0.8434 fracAtOrAbove0.70=1.000
RESULT human_B n=50 min=0.7781 p05=0.8039 median=0.8434 fracAtOrAbove0.70=1.000
RESULT human_C n=50 min=0.7781 p05=0.8039 median=0.8434 fracAtOrAbove0.70=1.000
RESULT randomJitterBot_baseline n=50 min=0.5154 p05=0.5255 median=0.5669 fracAtOrAbove0.70=0.000
RESULT randomJitterBot_A n=50 min=0.3436 p05=0.3503 median=0.3780 fracAtOrAbove0.70=0.000
RESULT randomJitterBot_B n=50 min=0.5103 p05=0.5170 median=0.5446 fracAtOrAbove0.70=0.000
RESULT randomJitterBot_C n=50 min=0.3032 p05=0.3091 median=0.3335 fracAtOrAbove0.70=0.000
RESULT gaussianBot_baseline n=50 min=0.6408 p05=0.6488 median=0.7186 fracAtOrAbove0.70=0.680
RESULT gaussianBot_A n=50 min=0.4272 p05=0.4326 median=0.4791 fracAtOrAbove0.70=0.000
RESULT gaussianBot_B n=50 min=0.5939 p05=0.5992 median=0.6457 fracAtOrAbove0.70=0.020
RESULT gaussianBot_C n=50 min=0.3769 p05=0.3817 median=0.4227 fracAtOrAbove0.70=0.000
RESULT replayBot_baseline n=50 min=0.6990 p05=0.7188 median=0.7671 fracAtOrAbove0.70=0.980
RESULT replayBot_A n=50 min=0.5048 p05=0.5191 median=0.5540 fracAtOrAbove0.70=0.000
RESULT replayBot_B n=50 min=0.6437 p05=0.6580 median=0.6929 fracAtOrAbove0.70=0.300
RESULT replayBot_C n=50 min=0.4543 p05=0.4672 median=0.4986 fracAtOrAbove0.70=0.000
RESULT constantBot_baseline n=50 min=0.1386 p05=0.1386 median=0.1386 fracAtOrAbove0.70=0.000
RESULT constantBot_A n=50 min=0.0924 p05=0.0924 median=0.0924 fracAtOrAbove0.70=0.000
RESULT constantBot_B n=50 min=0.2591 p05=0.2591 median=0.2591 fracAtOrAbove0.70=0.000
RESULT constantBot_C n=50 min=0.0815 p05=0.0815 median=0.0815 fracAtOrAbove0.70=0.000
```

`SELFCHECK ... =0` confirms the re-weighting is exact: on windows where the target metrics
did not abstain, every candidate reproduces the baseline score to 1e-12.

## Candidate by candidate, against the human constraint

| candidate | real windows below 0.4635 floor | real frac >= 0.70 | gaussianBot median | replayBot median |
|---|---|---|---|---|
| baseline | 0 | 0.833 | 0.7186 | 0.7671 |
| A (zero rollover -> 0) | **14** | 0.586 | 0.4791 | 0.5540 |
| B (zero rollover -> 0.5) | 0 | 0.759 | 0.6457 | 0.6929 |
| C (zero rollover -> 0, zero correction -> 0) | **76** | 0.436 | 0.4227 | 0.4986 |

- **A — refuted.** It is the strongest bot penalty (both bot medians fall below 0.5), but it
  pushes 14 real human windows below the 0.4635 floor (new min 0.4034). Human protection is
  the hard constraint, so A is dead whatever it does to bots. Prediction held.
- **C — refuted, worse.** Every CMU window has zero corrections by protocol, so C penalises
  100% of them; 76 windows fall below the floor (new min 0.3631) and real frac >= 0.70 nearly
  halves. Dead. Prediction held.
- **B — confirmed as the survivor.** No real window falls below the floor — by construction,
  pulling a score toward 0.5 cannot produce a value below `min(score, 0.5)`, and the floor is
  below 0.5. Both bot medians drop under 0.70 (gaussian 0.7186 -> 0.6457, replay 0.7671 ->
  0.6929). Prediction held.

## What B costs, stated plainly

B is not free and it is not a fix:

- **Real humans pay 7.4 points of headroom:** the fraction of real windows at or above 0.70
  falls from 0.833 to 0.759 — about 181 of the 2,448 real windows that were >= 0.70 drop
  below it (0.074 x 2448; the printed RESULT lines are the measurement, this count is derived
  from them). Only zero-rollover windows can move under B, so those 181 all come from that
  subset. These are genuine typists who would now need another window to reach `human`.
- **replayBot is only half-closed:** its median drops below 0.70, but 30% of seeds still score
  >= 0.70 (down from 98%). B narrows the replay gap; it does not shut it. gaussianBot is
  nearly closed (68% -> 2%).
- **The floor margin is thin:** real p05 under B is 0.5989, only 0.13 above the floor. B does
  not lower the floor, but it thickens the left tail just above it.

## The fixture-circularity finding, made concrete

Every candidate leaves the **synthetic human fixture completely unmoved** (min 0.7781, frac
1.000, identical across baseline/A/B/C). `generateHumanLike` always emits `rollovers > 0`
(`tests/fixtures/human-profiles.ts:56-57`), so it never triggers the zero-rollover branch —
while **26.4% of real human windows do**. A change tested only against the in-repo human
fixture would show zero human cost and look free. The real corpus is what exposes the 7.4-point
price. This is direct evidence for why the fixtures cannot stand in for a real-human floor.

## Evidence-ladder rung

**Real corpus (human side) + in-repo fixtures (bot side).** The human-cost numbers stand on
the CMU corpus (third rung). The bot numbers still stand on synthetic fixtures (bottom rung) —
B "drops the bot median below 0.70" is a fact about `generateGaussianBot`/`generateReplayBot`,
not about real automation. The HN attacker's 0.63
(`research/papers/hn-2026-bobbiechen-attack.md`) is a real data point on the bot side, but a
single self-reported score, not a distribution. Caps from the baseline experiment carry:
fixed-text password typing, no corrections in the corpus, rollover mapped from adjacent-pair
overlap only, and `analyze` fed directly with no observer or hysteresis.

## What this does not show

- Not that B is worth shipping. That is an api-steward decision: B moves every consumer's
  score distribution (a semver question) and trades 7.4 points of real-human headroom for a
  partial close of the replay gap. The route is `/cadence:build` with this file as evidence.
- Nothing about real bots — the bot side is still synthetic. B's effect on a real scripted
  attacker (the HN method) is unmeasured; the next rung is live capture (Playwright typing
  into the demo), which browser-expert would design.
- Not that 0.5 is the right vote for a zero-rollover window, nor that the constant weights
  (0.25 rollover, 0.10 correction) are right. This tested three fixed treatments, not a sweep.
- Nothing about the observer's rollover counting under real overlap — the CMU mapping sees
  only adjacent-pair overlap, so real zero-rollover prevalence in the live pipeline may differ.
