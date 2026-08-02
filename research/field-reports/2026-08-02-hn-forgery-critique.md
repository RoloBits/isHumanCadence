# Field report: live forgery of the analyzer, demonstrated on Hacker News

- **Kind:** field report — a real-world adversarial result against the shipped library.
  Not a paper (no method you can rerun), not an experiment (we did not run it). It is the
  only data point in `research/` that comes from the live library instead of synthetic
  input, which puts it on the **live browser** rung of the evidence ladder — with the cap
  that every number in it is self-reported by the attacker and unreproducible (no script,
  no seed, no version pin).
- **Source:** Hacker News item 46940197 ("Show HN: IsHumanCadence – Bot detection via
  keystroke dynamics (no CAPTCHAs)", posted by frankLopez 2026-02-09), comment 46940722 by
  `bobbiechen`, 2026-02-09T01:58:56Z. Thread re-fetched 2026-08-02 via
  `https://hn.algolia.com/api/v1/items/46940197`; it has exactly two comments, the
  author's intro and this one.
- **Links:** <https://news.ycombinator.com/item?id=46940197> (thread),
  <https://news.ycombinator.com/item?id=46940722> (comment).
- **Companion entry:** `research/papers/hn-2026-bobbiechen-attack.md` holds the verbatim
  comment text and the claimed-vs-verifiable breakdown. This report is the working note:
  what happened, the mechanism, and what it changes.

## What happened, in numbers

The commenter self-identifies as working in bot detection. Two attacks, both AI-generated
scripts ("about 5 seconds of Cursor use"):

1. **Naive forgery** — a basic keystroke-injection script with no knowledge of the
   metrics: final score **~0.45**, and it was **never confidently marked human**. That is
   the library working as intended against a lazy attacker: 0.45 sits inside the
   `unknown` band (0.35–0.70, `src/index.ts:5-10`).
2. **Targeted forgery** — same effort, but with **the five metric names put in the
   prompt**: score **0.63, classified human AND confident**. The commenter calls this
   "insider information", but the metric names are in the public README; the insider step
   costs one paste.

Quote on the mechanism (verbatim, from the comment):

> "you'd want to do some hardening on the client-side script since it's easy to
> manipulate the Javascript environment."

## Why 0.63 reads as "human and confident"

Two shipped behaviours make 0.63 a winning score, both verifiable in this repo:

- **Hysteresis:** `unknownToHuman` is 0.70 but `humanToUnknown` is 0.60
  (`src/index.ts:5-10`). A session that ever peaks at 0.70 stays classified `human` all
  the way down to 0.60. The advanced script almost certainly crossed 0.70 at some point
  and then settled at 0.63 inside the retention band.
- **`confident` is a sample count, not a confidence:** it flips true at
  `sampleCount >= minSamples` (20 by default, `src/analyzer.ts:260`). Any bot that types
  20 keystrokes is "confident".

## Why this matters here

- It independently confirms the in-repo finding: the 2026-08-02 fixture sweep
  (`research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/`) already showed
  synthetic Gaussian and replay generators crossing 0.70 (medians 0.7186 and 0.7671).
  Same mechanism — sample timings from human-like distributions — observed against the
  live library by an outside adversary. The "fixtures too human-like" reading of that
  sweep is now much weaker.
- It calibrates the threat model: the gap between "naive script: never human" and
  "metric-aware script: human and confident" is exactly one prompt edit. Any hardening
  that only defeats naive scripts defends against an attacker who has not read the README.

## The honest ceiling

No client-side timing library can beat an adversary who owns the client. The attacker
controls `performance.now`, can dispatch or CDP-inject events, and can patch the library
itself — `browser-expert`'s standing position in this repo, and bobbiechen just proved the
practical version. The goal downstream of this report is therefore **not**
unforgeability. It is: (1) close holes that make forgery cheap, (2) weight
hard-to-fake signals over easy ones so a targeted forger has to model more, and (3) do
none of that at the cost of classifying real humans as bots. The follow-up experiments
(rollover abstention, forgeability ladder, widened-human false-positive rate, re-weight
search) are all under `research/experiments/2026-08-02-*`.
