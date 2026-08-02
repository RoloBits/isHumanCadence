---
name: public-api
description: What counts as the published surface of this package and what a change to it costs. Read this before adding, removing or renaming anything exported, before adding a field to a type in src/types.ts, and before deciding whether a change is breaking. Covers the three barrels that have to be edited together, the exports map that decides what is reachable at all, and the changes that break a consumer without breaking a build.
---

# The public API

**The surface is whatever `package.json`'s `exports` map reaches, and nothing else.**

Three entry points, no wildcard:

| Specifier | File | Emitted as |
|---|---|---|
| `@rolobits/is-human-cadence` | `src/index.ts` | esm + cjs + iife (global `IsHumanCadence`) |
| `@rolobits/is-human-cadence/react` | `src/react/index.ts` | esm + cjs |
| `@rolobits/is-human-cadence/vue` | `src/vue/index.ts` | esm + cjs |

Because there is no `"./*"` pattern in `exports`, a consumer cannot import
`@rolobits/is-human-cadence/dist/analyzer`. `createAnalyzer`, `createObserver`, `createBuffer`,
`detectSpoof`, `shannonEntropy`, `autocorrelation` and the rest are **internal**, even though the
test suite imports them by relative path. Renaming one of them is not a breaking change. Renaming
`createCadence` is.

## The three barrels are edited together, or the package ships broken

`src/types.ts` declares ten exported types. All ten are re-exported three times:

- `src/index.ts:49` — one line, ten names.
- `src/react/index.ts:5-16` — the same ten, as a block.
- `src/vue/index.ts:5-16` — the same ten, as a block.

Nothing checks that the three lists agree. `tsc` is happy with any of them; each barrel is
independently valid. A type added to `types.ts` and wired into two of the three produces a `.d.ts`
that resolves for a React consumer and fails for a Vue one, with an error that points at the
consumer's file rather than at this package.

**That is not hypothetical.** v1.5.1 is `fix: fix export types on react and vue` (`c89f771`) — the
release that existed to repair exactly this.

So: **any change to the exported names in `src/types.ts` touches four files, and the fourth is the
test that would have caught it.** There is no such test today. If you are adding a type and want
one thing to leave behind, it is an assertion that the three barrels export the same set.

## What breaks a consumer

Ranked by how visible the break is at the moment it happens. The bottom two are the dangerous ones.

| Change | Breaks | Visible when |
|---|---|---|
| An export removed or renamed | Yes | Their build, immediately |
| A function parameter made required | Yes | Their build, immediately |
| A field removed from a returned object | Yes | Their build, if they read it |
| A field **added** to a returned object | No | — |
| A new optional config option | No | — |
| A field added to an object the consumer **constructs** (`MetricWeights`, `ClassificationThresholds`) | Yes, if required | Their build |
| **A default constant retuned** | Yes, silently | Never — their build is green and their scores moved |
| **A default threshold moved** | Yes, silently | Never — their `classification` flips on the same input |

The last two rows are why this file exists. `DEFAULT_WEIGHTS` (`analyzer.ts:20`) and
`DEFAULT_CLASSIFICATION_THRESHOLDS` (`index.ts:5`) are exported, so a consumer can read them,
spread them, and calibrate their own logic against them. Changing either changes what the library
returns for identical input while changing no type at all. Say so in the commit body and take the
bump level to `releasing/SKILL.md`.

## The adapters are not the core, and they have already drifted

React's `useHumanCadence` returns `score`, `confident`, `metrics`, `signals`, `sampleCount`,
`classification`, `reset()`, `snapshot()`, and accepts a `recordEvents` option.

Vue's `useHumanCadence` returns `target`, `score`, `confident`, `metrics`, `classification`,
`reset` — **no `signals`, no `sampleCount`, no `snapshot()`** — and accepts no `recordEvents`.

Verified 2026-08-02 at `src/react/index.ts:19-51` and `src/vue/index.ts:19-43`. There is no test
for the Vue composable at all; `tests/vue/vHumanCadence.test.ts` covers only the `vHumanCadence`
directive.

Whether that gap is a decision or an omission is **an open question, not a decision** — it is not
recorded anywhere in the repo. Do not close it silently in either direction. Adding a field to
`CadenceResult` and wiring it into React only widens a gap nobody has chosen.

## Adding an export — the checklist

1. Does it need to be public at all? An internal helper reachable only by relative path costs
   nothing to rename later. A public one is a promise.
2. If it is a type: add it to `src/types.ts`, then to **all three** barrels.
3. If it is a value: decide whether it belongs in core or in an adapter, and whether the other
   adapter needs a matching one. Say which you chose and why.
4. If it is a config option: optional, with a default that preserves current behaviour. A new
   required option is a major.
5. Write the test. For a type-level addition the useful test is the one that fails when a barrel
   is missed.
6. Take the bump level to `releasing/SKILL.md`. Adding an export is `feat:`.

## What this does not cover

Whether the thing *should* exist — that is `api-steward`. What the code currently does — that is
`cadence-core`. What the bundler and npm do with the `exports` map — that is `browser-expert`.
