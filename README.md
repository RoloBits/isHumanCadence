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

<br>

Analyzes **how** users type, not **what** they type. The library monitors keystroke timing to produce a humanity score from `0.0` (bot) to `1.0` (human) — without ever knowing which keys were pressed.

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

---

## Features

- **Silent** — runs in the background, no user interaction needed
- **Privacy-first** — key-agnostic, never records what you type, only when
- **Tiny** — under 3KB gzipped, zero dependencies
- **Framework ready** — vanilla JS, React hook, Vue directive + composable
- **Anti-spoof** — detects `Math.random()` jitter, replays, and paste attacks via KS test
- **Zero input lag** — passive listeners + async analysis via `requestIdleCallback`

---

## Install

```bash
npm install @rolobits/is-human-cadence
```

---

## Quick Start

### Vanilla JS / TypeScript

```ts
import { createCadence } from '@rolobits/is-human-cadence';

const input = document.querySelector('#email');
const cadence = createCadence(input, {
  minSamples: 20,
  onScore(result) {
    if (result.confident && result.score < 0.3) {
      showCaptchaFallback();
    }
  },
});

cadence.start();

// Get score on demand
const result = cadence.analyze();
console.log(result.score);     // 0.0–1.0
console.log(result.confident); // true when enough data collected

// Cleanup
cadence.destroy();
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

### Vue

```vue
<script setup>
import { useHumanCadence } from '@rolobits/is-human-cadence/vue';

const { target, score, confident } = useHumanCadence({ minSamples: 20 });
</script>

<template>
  <input ref="target" type="email" />
  <CaptchaChallenge v-if="confident && score < 0.3" />
</template>
```

**Directive:**

```vue
<script setup>
import { vHumanCadence } from '@rolobits/is-human-cadence/vue';

function onScore(result) {
  if (result.confident && result.score < 0.3) {
    showCaptcha();
  }
}
</script>

<template>
  <input v-human-cadence="onScore" type="email" />
</template>
```

---

## API

### `createCadence(target, config?)`

Creates a cadence analyzer attached to a DOM element.

**Config:**

| Option | Type | Default | Description |
|---|---|---|---|
| `windowSize` | `number` | `50` | Keystrokes in the sliding window |
| `minSamples` | `number` | `20` | Minimum samples before `confident` is `true` |
| `weights` | `Partial<MetricWeights>` | see below | Custom weights per metric |
| `onScore` | `(result) => void` | — | Callback on new score |
| `scheduling` | `'idle' \| 'manual'` | `'idle'` | `'idle'` = requestIdleCallback, `'manual'` = explicit `analyze()` |

**Methods:**

| Method | Description |
|---|---|
| `start()` | Begin listening for keyboard events |
| `stop()` | Pause listening (preserves collected data) |
| `analyze()` | Compute and return a `CadenceResult` synchronously |
| `reset()` | Clear all collected data |
| `destroy()` | Stop + release all resources |

### `CadenceResult`

```ts
{
  score: number;       // 0.0 (bot) to 1.0 (human)
  confident: boolean;  // true when sampleCount >= minSamples
  sampleCount: number; // keystrokes in current window
  metrics: {
    dwellVariance: number;    // key-hold time variability
    flightFit: number;        // timing distribution fit (KS test)
    timingEntropy: number;    // randomness of timing patterns
    correctionRatio: number;  // backspace/delete usage
    burstRegularity: number;  // irregularity of typing bursts
  }
}
```

### Default Weights

```ts
{
  dwellVariance:   0.15,
  flightFit:       0.30,  // strongest discriminator
  timingEntropy:   0.20,
  correctionRatio: 0.15,
  burstRegularity: 0.20,
}
```

---

## How It Works

Every keystroke produces two timing measurements:

- **Dwell time** — how long a key is held down (`release − press`)
- **Flight time** — the gap between releasing one key and pressing the next

Human typing creates patterns that are hard to fake:

| Signal | Human | Bot |
|---|---|---|
| Flight time distribution | [Log-normal](https://en.wikipedia.org/wiki/Log-normal_distribution) (right-skewed) | Uniform or constant |
| Dwell time variance | 15–60ms σ | Near-zero or perfectly constant |
| Corrections (Backspace) | 2–15% of keystrokes | 0% |
| Burst gaps | Irregular pauses | Evenly spaced |
| Serial correlation | Positive (digraph effects: "th" is fast, "qz" is slow) | ~0 (random jitter has no memory) |

The library runs a **Kolmogorov-Smirnov test** to compare timing distributions against known human/bot profiles, then combines all five signals through **sigmoid normalization** into a weighted score.

### Detection Coverage

| Attack | How it's caught |
|---|---|
| Clipboard paste | Zero dwell/flight times |
| `setInterval` + `dispatchEvent` | Constant timing, zero entropy |
| `Math.random()` jitter | Uniform distribution, zero autocorrelation |
| Recorded keystroke replay | No corrections, no natural pauses |

---

## Privacy

This library is **key-agnostic** by design. It cannot function as a keylogger.

| | What |
|---|---|
| **Captured** | Timestamps (`performance.now()`), timing deltas, correction count, aggregate stats |
| **Never captured** | Key identity, input content, key sequences, user/device info |
| **Network** | Zero requests |
| **Storage** | Nothing persisted (no cookies, localStorage, IndexedDB) |

The only place `event.key` is read is a boolean check for `Backspace`/`Delete` — the key value is never stored.

---

## Browser Support

ES2020+ environments. All modern browsers. Uses `requestIdleCallback` with `setTimeout` fallback for Safari.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/RoloBits/isHumanCadence.git
npm install
npm test
```

## License

[MIT](./LICENSE)
