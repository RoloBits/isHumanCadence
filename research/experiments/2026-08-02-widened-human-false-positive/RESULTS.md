# Results — the false positives live in the slow typists

**Verdict: confirmed.** A widened synthetic human population produces a real false-positive
tail below the `0.70` confident-human threshold, and it is concentrated almost entirely in slow
typists. No synthetic human crosses into bot territory (`< 0.35`).

## Command

```
npx vitest run --config research/vitest.config.ts
```

Run 2026-08-02, vitest 2.1.9. Literal output of this experiment's file:

```
RESULT all n=500 min=0.6084 median=0.8326 max=0.9242 fpBelow0.70=0.146 hardFpBelow0.35=0.000
RESULT fastTypists n=113 min=0.7718 median=0.8657 max=0.9242 fpBelow0.70=0.000 hardFpBelow0.35=0.000
RESULT slowTypists n=387 min=0.6084 median=0.8089 max=0.9206 fpBelow0.70=0.189 hardFpBelow0.35=0.000
RESULT zeroRollover n=43 min=0.7678 median=0.8516 max=0.9119 fpBelow0.70=0.000 hardFpBelow0.35=0.000
RESULT zeroRolloverShare=0.086
```

## What it shows

- **14.6% of the widened population fails to reach confident-human** (`fpBelow0.70`), against a
  narrow in-repo fixture that never dips below `0.7781`. Widening the human model exposes a
  false-positive tail the fixture hides — the same direction the real CMU corpus shows
  (16.7% below 0.70, `../2026-08-02-cmu-real-human-baseline/`).
- **The tail is slow typists.** `slowTypists` fail at 18.9%; `fastTypists` at 0.0%. The library
  reads a deliberate, even keystroke rhythm as machine-like, and slow-and-even is exactly how a
  careful or hunt-and-peck human types. This is the human population most at risk of being
  called a bot.
- **No hard false positives.** `hardFpBelow0.35 = 0.000` everywhere — a synthetic human loses the
  *confident* verdict but is never classified an outright bot. Matches the real corpus.
- **Zero-rollover humans are not the problem here** (`fpBelow0.70 = 0.000` for the 8.6% who never
  overlap keys), because the abstention *helps* them: with rollover abstaining, their score rests
  on the metrics they do pass. That is the mirror image of the bot case, and it is exactly why the
  naive zero-rollover fix (candidate A, `../2026-08-02-zero-rollover-abstention-candidates/`)
  backfires on real humans.

## Evidence-ladder rung

**Synthetic widened population.** The generator's parameter ranges (flight medians ~120–400ms,
dwell, correction and rollover rates) are chosen to span the human population, but they are still
a model this repo wrote. It agrees with the real CMU corpus on the headline (a ~15–17% sub-0.70
tail), which is corroboration, not proof. The real corpus is the oracle; this experiment exists to
show *which kind* of human falls in the tail, which the CMU password-typing task cannot (it has no
slow-vs-fast label and no corrections by protocol).

## What it does not show

Real slow typists in the wild — mobile, non-native, motor-impaired, elderly — may fall further and
harder than a synthetic slow typist. This sets a floor on the false-positive rate, not a ceiling.
It also says nothing about bots; the bot side is the forgeability ladder and the reweight search.
