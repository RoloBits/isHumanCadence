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

Bots type like machines constant intervals, zero variance, no typos. Humans are messy we pause to think, we hit backspace, we speed up on familiar words. This library picks up on that.

## Install

```bash
npm install @rolobits/is-human-cadence
```

## Usage

```ts
import { createCadence } from '@rolobits/is-human-cadence';

const cadence = createCadence(document.querySelector('#email'), {
  onScore(result) {
    if (result.confident && result.score < 0.3) {
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
  const { ref, score, confident } = useHumanCadence({ minSamples: 20 });

  return (
    <form>
      <input ref={ref} type="email" />
      {confident && score < 0.3 && <CaptchaChallenge />}
    </form>
  );
}
```

**Multi-field forms** — attach `ref` to a wrapper element instead of a single input. Keyboard events bubble up from child fields, so one hook covers the entire form.

```tsx
import { useHumanCadence } from '@rolobits/is-human-cadence/react';

function SignupForm() {
  const { ref, score, confident } = useHumanCadence({ minSamples: 20 });

  return (
    <form onSubmit={handleSubmit}>
      <div ref={ref}>
        <input type="text" name="name" placeholder="Name" />
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Password" />
      </div>
      <button type="submit" disabled={!confident || score < 0.5}>
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

const { target, score, confident } = useHumanCadence({ minSamples: 20 });
</script>

<template>
  <input ref="target" type="email" />
  <CaptchaChallenge v-if="confident && score < 0.3" />
</template>
```

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

Five signals, combined into one score:

| Signal | What it checks | Human | Bot |
|---|---|---|---|
| **Dwell variance** | How much key-hold durations vary | Varies naturally | Nearly identical |
| **Flight fit** | Whether inter-key timing follows a natural curve | Yes | Flat/constant |
| **Timing entropy** | Randomness in rhythm | Moderate | Too uniform or too constant |
| **Correction ratio** | Backspace/Delete usage | Human bonus (2–15%) | No signal (0%) |
| **Burst regularity** | Pauses between typing bursts | Irregular | Metronomic |

Each gets normalized to 0–1 and combined with configurable weights.

### Correction ratio as a human bonus

Corrections are a one-directional human signal — bots don't backspace. The [Aalto 136M Keystrokes study (Dhakal et al., CHI 2018)](https://doi.org/10.1145/3173574.3174220) shows correction rates vary enormously across typists: fast typists average 3.4% (SD 2.05%), slow typists average 9.05% (SD 6.85%). Zero corrections over 50 keystrokes is normal for roughly half of skilled typists.

Because the absence of corrections is uninformative rather than suspicious, the metric scores on a `[0.5, 1.0]` range:

| Corrections | Score | Interpretation |
|---|---|---|
| 0% | **0.50** | Neutral — no signal either way |
| 1–2% | 0.61–0.74 | Light human signal |
| 5%+ | 0.96+ | Strong human signal |

The other four metrics (dwell variance, flight fit, timing entropy, burst regularity) handle bot detection through timing analysis. Correction ratio only adds confidence when corrections are present — it never penalizes their absence.

## What it catches

| Attack | Why it fails |
|---|---|
| Clipboard paste | No keystrokes at all |
| `setInterval` + `dispatchEvent` | Constant timing, zero entropy |
| `Math.random()` jitter | Uniform distribution, no autocorrelation |
| Recorded keystroke replay | No corrections, no natural pauses |

## API

### `createCadence(target, config?)`

| Option | Type | Default | |
|---|---|---|---|
| `windowSize` | `number` | `50` | Keystrokes in sliding window |
| `minSamples` | `number` | `20` | Samples before `confident: true` |
| `weights` | `Partial<MetricWeights>` | — | Override metric weights |
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
  score: number;       // 0.0 (bot) → 1.0 (human)
  confident: boolean;  // true when enough data
  sampleCount: number;
  metrics: {
    dwellVariance: number;
    flightFit: number;
    timingEntropy: number;
    correctionRatio: number;
    burstRegularity: number;
  };
  signals: {
    pasteDetected: boolean;    // paste event was detected
    syntheticEvents: number;   // programmatic (non-user) events seen
    insufficientData: boolean; // not enough samples to judge
  };
}
```

### Default weights

```ts
{
  dwellVariance:   0.15,
  flightFit:       0.30,  // strongest signal
  timingEntropy:   0.20,
  correctionRatio: 0.15,
  burstRegularity: 0.20,
}
```

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
  if (result.score < 0.3) {
    showFallbackChallenge();                 // email verify, simple question, etc.
  }
}
```

What works well:
- **Screen readers + physical keyboard** — scores normally (modifier keys are filtered)
- **On-screen keyboards** — scores normally

What may score low:
- **Voice-to-text** — few or no keydown/keyup events fire (`confident` stays false)
- **Switch access** — regular timing looks bot-like
- **Password managers** — synthetic events or paste

Use `result.signals` to understand *why* a score is low before acting on it.

## Contributing

PRs welcome. Open an issue first to discuss.

```bash
git clone https://github.com/RoloBits/isHumanCadence.git
npm install
npm test
```

## License

[MIT](./LICENSE)
