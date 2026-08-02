# HN attack report: bobbiechen scripts past the analyzer (Show HN thread)

- **Citation:** bobbiechen (Hacker News user), comment on "Show HN: IsHumanCadence – Bot
  detection via keystroke dynamics (no CAPTCHAs)", HN item 46940197, comment id 46940722,
  2026-02-09T01:58:56Z. The commenter self-identifies as working in bot detection and links
  a Stytch blog post, so the likely identity is a Stytch employee; the identity is not
  verified beyond the username.
- **Link:** <https://news.ycombinator.com/item?id=46940197> (thread),
  <https://news.ycombinator.com/item?id=46940722> (the comment). Referenced demo:
  <https://stytch.com/blog/combating-ai-threats-stytchs-device-fingerprinting/>
- **Read-status:** read — full thread fetched 2026-08-02 via the Algolia HN API
  (`https://hn.algolia.com/api/v1/items/46940197`), raw comment text captured. The thread
  has exactly two comments: the author's intro and this one. The Stytch blog post was NOT
  fetched; the "about 5 seconds of Cursor use (around 4:25)" claim is cited to it, unread.
- **Kind:** primary source — a real attack report against this exact library, by a
  practitioner. Not peer-reviewed; all numbers are self-reported and unreproducible from
  the comment alone (no script, no seed, no version pin).

## The claims, verbatim

On feasibility:

> "I work in this space of bot detection and unfortunately it is trivial to write scripts
> (or prompt AIs) to insert human-like keystroke and mouse movements. I did so in this demo
> with about 5 seconds of Cursor use (around 4:25)"

On the actual attack against this library:

> "Edit: I ended up testing it, not bad! The basic script got to about 0.45 in the end,
> but never was confidently marked as human. With the hint of the 5 metrics in the prompt,
> a more advanced script did get to 0.63 (human and confident), but that needed the
> insider information."

On the client environment:

> "you'd want to do some hardening on the client-side script since it's easy to manipulate
> the Javascript environment."

## Verifiable vs claimed

- **Claimed, not verifiable:** the two scores (0.45, 0.63), the method (AI-generated
  keystroke script via Cursor), and the "5 seconds" effort figure. No script or event
  trace was published; the library version tested (early Feb 2026) is not stated.
- **Verifiable against this repo:** a reading of 0.63 reported as "human and confident"
  is consistent with the shipped hysteresis: `unknownToHuman` is 0.70 but `humanToUnknown`
  is 0.60 (`src/index.ts:5-10`), so a session that ever crossed 0.70 stays classified
  `human` down to 0.60. The report is therefore plausibly accurate as stated — the
  advanced script's score likely peaked at or above 0.70 at some point.
- **Consistent with the in-repo evidence:** the 2026-08-02 fixture sweep
  (`research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/`) already showed
  synthetic Gaussian-jitter and replay generators reaching medians of 0.7186 and 0.7671.
  An attacker sampling from human-like distributions crossing 0.70 is the same mechanism,
  observed independently against the live library.

## Relevance to this repo

Two separate problems are named, and only one is in scope for the research program:

1. **Scoring can be beaten by generated human-like timing.** In scope. This bears on
   `src/analyzer.ts` (weights, `NO_DATA` abstention) and `src/anti-spoof.ts` (the KS
   machinery the advanced script implicitly defeated).
2. **The client JS environment is easy to manipulate** (replace `performance.now`,
   dispatch synthetic events, patch the library itself). Out of scope for this program —
   client-side hardening is an api-steward/browser-expert question, not an evidence
   question. Recorded here so the entry is honest about what the source actually said.
