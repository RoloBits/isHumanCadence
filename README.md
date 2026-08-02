<p align="center">
  <h1 align="center">is-human-cadence</h1>
  <p align="center">
    Bot detection through keystroke rhythm. No CAPTCHAs, no interruptions.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rolobits/is-human-cadence"><img src="https://img.shields.io/npm/v/@rolobits/is-human-cadence?style=flat-square&color=blue" alt="npm"></a>
  <a href="https://bundlephobia.com/package/@rolobits/is-human-cadence"><img src="https://img.shields.io/bundlephobia/minzip/@rolobits/is-human-cadence?style=flat-square&color=green" alt="bundle size"></a>
  <img src="https://img.shields.io/badge/types-TypeScript-blue?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/deps-0-brightgreen?style=flat-square" alt="zero dependencies">
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@rolobits/is-human-cadence?style=flat-square" alt="license"></a>
</p>

<p align="center">
  <a href="https://rolobits.github.io/isHumanCadence/">
    <img src="https://img.shields.io/badge/%E2%96%B6%20React%20Demo-Try%20it%20out-blueviolet?style=for-the-badge" alt="React Demo">
  </a>
</p>

<br>

Looks at **when** you press keys, not **which** keys you press. Gives you a `0.0` (bot) to `1.0` (human) score based on typing rhythm alone.
```
  Keystrokes        Timing Deltas         Statistical Analysis        Score
 ┌──────────┐      ┌─────────────┐       ┌────────────────────┐    ┌───────┐
 │ keydown  │─────▶│ dwell time  │──┐    │  KS test           │    │       │
 │ keyup    │─────▶│ flight time │──┼───▶│  entropy           │───▶│ 0–1.0 │
 │ paste    │─────▶│ corrections │──┘    │  autocorrelation   │    │       │
 └──────────┘      └─────────────┘       └────────────────────┘    └───────┘
    passive           zero GC              requestIdleCallback       human
   listeners          circular buf         async analysis            score
```
## Why

Bots type like machines — constant intervals, zero variance, no typos. Humans are messy — we pause to think, we hit backspace, we speed up on familiar words. This library picks up on that.

## What this is, and what it is not

This raises the cost of drive-by automation — `setInterval` typing, paste-only bots, naive replay — and gives you a behavioural signal you did not have before. It is **not** a defense against an adversary who reads the client code: the library runs in the browser the attacker controls, and a forger built from the six metric names outscores both the synthetic human fixture and the median real human (0.8498 vs 0.8431 and 0.8044 — measured, see `research/`). No weight configuration catches that forger.

Use the score as one signal among several, and as a trigger for a fallback challenge (email verification, a simple question) — never as a hard gate.

## How it works

1. Passive `keydown`/`keyup` listeners capture timing only — dwell (how long a key is held), flight (gap between keys), rollover (next key pressed before the previous is released), and a correction count — into fixed-size ring buffers.
2. Six metrics score the current window, each normalized so higher = more human.
3. A metric with nothing to say (zero corrections, zero rollovers, no bursts) **abstains**: internally it returns a `NO_DATA` sentinel and its weight redistributes across the metrics that did vote. In the public `metrics` object an abstention reads as `0`.
4. The score is the weighted mean of the metrics that voted.
5. `classification` passes the score through a three-state Schmitt trigger with hysteresis (see [Classification with hysteresis](#classification-with-hysteresis)), so the label does not flicker at a boundary.

`confident` is a sample-count threshold — `sampleCount >= minSamples` — not a statistical confidence.

## Install

```bash
npm install @rolobits/is-human-cadence
```

Zero runtime dependencies. The core entry gzips to about 3.5 KB (`dist/index.js`, 3485 bytes measured at v1.6.0).

## Usage

```ts
import { createCadence } from '@rolobits/is-human-cadence';

const cadence = createCadence(document.querySelector('#email'), {
  onScore(result) {
    if (result.confident && result.classification === 'bot') {
      showCaptchaFallback();
    }
  },
});

cadence.start();
```

### React

```tsx
import { useHumanCadence } from '@rolobits/is-human-cadence/react';

function LoginForm() {
  const { ref, confident, classification } = useHumanCadence({ minSamples: 20 });

  return (
    <form>
      <input ref={ref} type="email" />
      {confident && classification === 'bot' && <CaptchaChallenge />}
    </form>
  );
}
```

All core types and constants (`CadenceResult`, `Classification`, `DEFAULT_WEIGHTS`, etc.) are re-exported from `@rolobits/is-human-cadence/react` — no need for a separate import.

**Multi-field forms** — attach `ref` to a wrapper element instead of a single input. Keyboard events bubble up from child fields, so one hook covers the entire form.

```tsx
import { useHumanCadence } from '@rolobits/is-human-cadence/react';

function SignupForm() {
  const { ref, confident, classification } = useHumanCadence({ minSamples: 20 });

  return (
    <form onSubmit={handleSubmit}>
      <div ref={ref}>
        <input type="text" name="name" placeholder="Name" />
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Password" />
      </div>
      <button type="submit" disabled={!confident || classification === 'bot'}>
        Sign Up
      </button>
    </form>
  );
}
```

### Vue

```html
<script setup>
import { useHumanCadence } from '@rolobits/is-human-cadence/vue';

const { target, confident, classification } = useHumanCadence({ minSamples: 20 });
</script>

<template>
  <input ref="target" type="email" />
  <CaptchaChallenge v-if="confident && classification === 'bot'" />
</template>
```

All core types and constants are re-exported from `@rolobits/is-human-cadence/vue`.

Or as a directive:

```html
<script setup>
import { vHumanCadence } from '@rolobits/is-human-cadence/vue';
</script>

<template>
  <input v-human-cadence="(result) => console.log(result.score)" type="email" />
</template>
```

## What it measures

Six signals, combined into one score:

| Signal | What it checks | Human | Bot |
|---|---|---|---|
| **Dwell variance** | How much key-hold durations vary | Varies naturally | Nearly identical |
| **Flight fit** | Whether inter-key timing follows a natural curve | Yes | Flat/constant |
| **Timing entropy** | Randomness in rhythm | Moderate | Too uniform or too constant |
| **Correction ratio** | Backspace/Delete usage | Human bonus (2–15%) | No signal (0%) |
| **Burst regularity** | Pauses between typing bursts | Irregular | Metronomic |
| **Rollover rate** | Key overlap (next pressed before previous released) | 25–50% | 0% |

Each gets normalized to 0–1 and combined with configurable weights.

### Correction ratio as a human bonus

Corrections are a one-directional human signal — bots don't backspace. The [Aalto 136M Keystrokes study (Dhakal et al., CHI 2018)](https://doi.org/10.1145/3173574.3174220) shows correction rates vary enormously across typists: fast typists average 3.4% (SD 2.05%), slow typists average 9.05% (SD 6.85%). Zero corrections over 50 keystrokes is normal for roughly half of skilled typists.

Because the absence of corrections is uninformative rather than suspicious, a zero-correction run **abstains**: the metric returns the internal `NO_DATA` sentinel, its 0.10 weight redistributes across the metrics that did vote, and the public `metrics.correctionRatio` reads `0` — meaning "did not vote", not "maximally bot-like".

| Corrections | Score | Interpretation |
|---|---|---|
| 0% | abstains (reported as `0`) | No signal — weight redistributes |
| 1% | ≈0.22 | Weak human signal |
| 2% | ≈0.48 | Moderate human signal |
| 5%+ | ≈0.93+ | Strong human signal |

Ratios above 30% take a ×0.8 penalty (held-key artifacts). The other five metrics handle bot detection through timing analysis. Correction ratio only adds confidence when corrections are present — it never penalizes their absence.

## What it catches

| Attack | Why it fails |
|---|---|
| Clipboard paste | No keystrokes at all |
| `setInterval` + `dispatchEvent` | Constant timing, zero entropy |
| `Math.random()` jitter | Uniform distribution, no autocorrelation |
| Recorded keystroke replay | No corrections, no natural pauses |
| Sub-60ms sustained IKI | Physically impossible for humans (>120 WPM sustained) |

## API

### `createCadence(target, config?)`

| Option | Type | Default | |
|---|---|---|---|
| `windowSize` | `number` | `50` | Keystrokes in sliding window |
| `minSamples` | `number` | `20` | Samples before `confident: true` |
| `weights` | `Partial<MetricWeights>` | — | Override metric weights |
| `classificationThresholds` | `Partial<ClassificationThresholds>` | — | Override hysteresis thresholds |
| `onScore` | `(result) => void` | — | Called on new score |
| `scheduling` | `'idle' \| 'manual'` | `'idle'` | `'idle'` = requestIdleCallback |

Returns:

| Method | |
|---|---|
| `start()` | Begin listening |
| `stop()` | Pause (keeps data) |
| `analyze()` | Get score now |
| `reset()` | Clear data, keep listening |
| `destroy()` | Stop + cleanup |

### `CadenceResult`

```ts
{
  score: number;              // 0.0 (bot) → 1.0 (human)
  classification: Classification; // 'bot' | 'unknown' | 'human' (with hysteresis)
  confident: boolean;         // true when enough data
  sampleCount: number;
  metrics: {
    dwellVariance: number;
    flightFit: number;
    timingEntropy: number;
    correctionRatio: number;
    burstRegularity: number;
    rolloverRate: number;
  };
  signals: {
    pasteDetected: boolean;            // paste event was detected
    syntheticEvents: number;           // programmatic (non-user) events seen
    insufficientData: boolean;         // not enough samples to judge
    inputWithoutKeystrokes: boolean;   // text entered via non-keyboard method
    inputWithoutKeystrokeCount: number; // count of such events
  };
}
```

### Default weights

```ts
{
  dwellVariance:   0.15,
  flightFit:       0.15,
  timingEntropy:   0.20,
  correctionRatio: 0.10,
  burstRegularity: 0.15,
  rolloverRate:    0.25,  // strongest human-only signal
}
```

### Classification with hysteresis

The `classification` field provides a stable `'bot' | 'unknown' | 'human'` label that won't flicker when the score hovers near a threshold. It uses [Schmitt trigger](https://en.wikipedia.org/wiki/Schmitt_trigger) hysteresis — different thresholds for entering vs. leaving a state:

```
            BOT              UNKNOWN              HUMAN
Score:  [0.0 -------- 0.35/0.45 ------- 0.60/0.70 -------- 1.0]
                         ↑                  ↑
                    dead zone          dead zone
```

| Transition | Threshold | |
|---|---|---|
| unknown → bot | `< 0.35` | Score must fall below 0.35 to become "bot" |
| bot → unknown | `≥ 0.45` | Score must rise to 0.45 to escape "bot" |
| unknown → human | `≥ 0.70` | Score must reach 0.70 to become "human" |
| human → unknown | `< 0.60` | Score must fall below 0.60 to leave "human" |

The 0.10-wide dead zones prevent rapid flickering when scores hover near boundaries.

**Custom thresholds:**

```ts
const cadence = createCadence(target, {
  classificationThresholds: {
    unknownToBot: 0.30,   // more lenient
    botToUnknown: 0.40,
    unknownToHuman: 0.75, // stricter
    humanToUnknown: 0.65,
  },
});
```

**Default thresholds** are exported as `DEFAULT_CLASSIFICATION_THRESHOLDS`.

## Privacy

Can't be used as a keylogger — it doesn't know which keys you press.

- **Captures**: timestamps, timing deltas, correction count, aggregate stats
- **Never captures**: key identity, text content, key sequences
- **No network requests**. No cookies, localStorage, or IndexedDB.

The only place `event.key` is read is a boolean check for Backspace/Delete — the value is never stored.

## Accessibility

This library analyzes keystroke timing. Some assistive technologies (voice-to-text,
switch access, eye-tracking keyboards) produce timing patterns that score low —
not because the user is a bot, but because the input method is different.

**The score is a signal, not a verdict.** Don't block users based on score alone.

Recommended pattern:

```ts
onScore(result) {
  if (!result.confident) return;             // not enough data yet
  if (result.signals.syntheticEvents > 0) return; // programmatic input, skip
  if (result.classification === 'bot') {
    showFallbackChallenge();                 // email verify, simple question, etc.
  }
}
```

Using `classification` instead of raw `score` comparisons prevents flickering when the score hovers near a threshold.

What works well:
- **Screen readers + physical keyboard** — scores normally (modifier keys are filtered)
- **On-screen keyboards** — scores normally

What may score low:
- **Voice-to-text** — few or no keydown/keyup events fire (`confident` stays false)
- **Switch access** — regular timing looks bot-like
- **Password managers** — synthetic events or paste

Use `result.signals` to understand *why* a score is low before acting on it.

## Contributing — agents welcome

**There is an unsolved problem here, and it is a real one.** A forger built from the six metric names scores 0.8498. The repo's own synthetic human fixture scores 0.8431 and the median real human in the CMU corpus scores 0.8044 — the forger outscores both. Every weight configuration searched so far catches it 0% of the time:

```
BOT_FN metricAwareForger=1.0000
```

Nobody knows whether a client-side timing signal can do better. That question is open, the evidence is in the repo, and a rigorous negative result is as welcome as a fix.

This project is built to be improved by autonomous agents as well as people, and the tooling is already here: four advisory agents under `.claude/agents/`, a tracked research record under `research/` with verified papers and reproducible experiments, a real human corpus (the CMU Killourhy–Maxion benchmark, one `curl` away), and a one-command benchmark, `npm run bench`, that scores any change against both error rates.

Three commands and you are measuring:

```bash
git clone https://github.com/RoloBits/isHumanCadence.git && cd isHumanCadence && npm install
curl -sL -o research/experiments/2026-08-02-cmu-real-human-baseline/DSL-StrongPasswordData.csv \
  "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"
npm run bench
```

**Agents propose, humans merge.** This is enforced by branch protection: every change lands through a pull request into `main` with a passing `Test` check; nobody can push to `main` directly. See `AGENTS.md` for the full contract and `CONTRIBUTING.md` for the flow.

The evidence bar: `npm test` passing proves nothing about accuracy — the suite runs against synthetic fixtures generated by this repo. A PR claiming a detection improvement must report both human false positives on the real CMU corpus and bot false negatives, with the literal command output.

### Known flaws — good places to start

All measured; the numbers and methods live in `research/`. Each one is a filed issue — [browse them](https://github.com/RoloBits/isHumanCadence/issues).

1. [#6](https://github.com/RoloBits/isHumanCadence/issues/6) **A code-aware forger beats the library.** A forger that reads the six metric names scores 0.8498 — above the synthetic human fixture (0.8431) and above the median real human (0.8044). No weight vector catches it (forger false-negative rate 1.000 under every configuration tried), and catching it at a 0.82 threshold rejects 59% of real humans. Structural — the open question is whether any client-side signal can do better.
2. [#7](https://github.com/RoloBits/isHumanCadence/issues/7) **Real humans have a low tail.** 16.7% of real CMU windows score below 0.70 (median 0.8044, floor 0.4635), concentrated in slow, even typists (18.9%; fast typists 0%). The synthetic human fixture never dips below 0.7781, so the test suite is blind to this.
3. [#8](https://github.com/RoloBits/isHumanCadence/issues/8) **The cheapest-to-fake metrics carry the most weight.** `rolloverRate` (0.25) and `correctionRatio` (0.10) go from 0 to ~1.0 purely by injecting events.
4. [#9](https://github.com/RoloBits/isHumanCadence/issues/9) **Abstention is invisible to consumers.** The public `metrics` object reports `NO_DATA` as `0`, so "did not vote" is indistinguishable from "scored zero".
5. [#10](https://github.com/RoloBits/isHumanCadence/issues/10) **Hysteresis is sticky.** Reaching `human` needs 0.70, but keeping it only needs 0.60 — a bot that once crossed 0.70 survives a drop that would have kept it out from a cold start.
6. [#11](https://github.com/RoloBits/isHumanCadence/issues/11) **Held Backspace inflates `correctionRatio`** — corrections increment before the key-repeat return in `observer.ts`. The current behaviour is pinned by a passing test, so the fix flips that test on purpose.
7. [#12](https://github.com/RoloBits/isHumanCadence/issues/12) **Ring-buffer and event-log dwells disagree under rollover.** Untested.
8. [#13](https://github.com/RoloBits/isHumanCadence/issues/13) **Vue adapter drift.** The Vue composable exposes no `signals`, `sampleCount`, `snapshot()` or `recordEvents` (React exposes all four), and has no test at all.
9. **Nothing checks the bundle size.** `npm run size` exists but is in neither `npm run check` nor CI, so a regression past the stated ~3.5KB ships green. (The broken `test:coverage` and `validate:aalto` entries, and the false `<3KB` tagline, were fixed in the same change that added `npm run bench`.)

```bash
git clone https://github.com/RoloBits/isHumanCadence.git
npm install
npm test
```

## License

[MIT](./LICENSE)
