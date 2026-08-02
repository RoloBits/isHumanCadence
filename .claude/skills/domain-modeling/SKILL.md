---
name: domain-modeling
description: Build and sharpen this project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active*
discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and
decisions down the moment they crystallise. (Merely *reading* `.claude/CONTEXT.md` for vocabulary
is not this skill — that's a one-line habit any skill can do. This skill is for when you're
changing the model, not just consuming it.)

## Where things live

This repo has a single context.

```
.claude/CONTEXT.md          ← the glossary
docs/adr/0001-slug.md       ← decisions, created lazily
src/
```

Create files lazily — only when you have something to write. `docs/adr/` does not exist yet;
create it when the first ADR is needed.

## Why this repo needs it more than most

The vocabulary here is statistical and the words are load-bearing: *dwell*, *flight*, *rollover*,
*burst*, *gating*, *confident*, *classification*. Two of them are already actively confusing.

- **`confident` is not statistical confidence.** It means `sampleCount >= minSamples` and nothing
  else (`analyzer.ts:259-260`).
- **`classification` is independent of `confident`.** A `bot` verdict can be emitted from three
  samples (`index.ts:12-27`).

And the glossary has already drifted from the code once: README lines 151-158 describe
`correctionRatio` as ranging `[0.5, 1.0]` with 0% corrections scoring 0.50, while the code returns
the `NO_DATA` sentinel at 0% and roughly 0.22 at 1%. The README documents a version of the metric
that no longer exists. That is what an unmaintained ubiquitous language costs.

## During the session

### Challenge against the glossary

When a term is used that conflicts with `.claude/CONTEXT.md`, call it out immediately. "The
glossary defines *flight* as keydown minus the previous keyup, but you're using it for the gap
between two keydowns — which is it?"

### Sharpen fuzzy language

When a vague or overloaded term appears, propose a precise canonical one. "*Confidence* — do you
mean `confident` (we have enough samples) or how sure the score is? Those are different things and
this library only has the first."

### Discuss concrete scenarios

Stress-test relationships with specific scenarios that probe the edges. A held Backspace. A paste.
Three keys down at once. A user who types for two seconds and stops. Each of those is a real path
through `observer.ts` and each has forced a definition here at least once.

### Cross-reference with code

When someone states how something works, check whether the code agrees, and cite `file.ts:line`.
Contradictions get surfaced, not smoothed over. `cadence-core` exists for exactly this lookup.

### Update CONTEXT.md inline

When a term is resolved, update `.claude/CONTEXT.md` right there. Don't batch these up.

Entry format — three lines, no more:

```md
**Flight time**:
The gap between one key being released and the next being pressed. Recorded only when exactly one
key is down, so rollover does not contaminate it.
_Avoid_: inter-key interval, IKI, gap
```

Rules:

- **Be opinionated.** When several words exist for one concept, pick one and list the rest under
  `_Avoid_`.
- **Keep definitions tight.** One or two sentences. Define what it IS, not what it does.
- **Only terms specific to this project.** Ring buffers, sigmoids and timeouts are general
  programming concepts and do not belong, however much the code uses them. *Dwell*, *rollover*
  and *gating* do.
- **Group under subheadings** when natural clusters emerge — capture, metrics, output.

`CONTEXT.md` is a glossary and nothing else. It carries no implementation detail, no weights, no
line numbers. Those rot; the words should not.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](ADR-FORMAT.md).

Decisions in this repo that meet all three and are currently recorded nowhere: the KS test running
at α = 0.10 rather than 0.05 because human flight times are a mixture of digraph distributions
(`anti-spoof.ts:64-69` carries the reason as a comment and nothing else does); `NO_DATA` gating
that redistributes weight instead of scoring absence as bot-like; hysteresis on classification
rather than a bare threshold; three entry points rather than one; zero runtime dependencies.

---

*Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock).*
