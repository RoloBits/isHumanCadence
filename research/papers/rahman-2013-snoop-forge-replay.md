# Snoop-Forge-Replay Attacks on Continuous Verification With Keystrokes

- **Citation:** Khandaker Abir Rahman, Kiran S. Balagani, Vir V. Phoha.
  "Snoop-Forge-Replay Attacks on Continuous Verification With Keystrokes."
  IEEE Transactions on Information Forensics and Security (TIFS), vol. 8, no. 3,
  March 2013, pp. 528-541.
- **Link/DOI:** <https://doi.org/10.1109/TIFS.2013.2244091>
  (<https://ieeexplore.ieee.org/document/6425469/>). Semantic Scholar record:
  <https://www.semanticscholar.org/paper/672c3da48ab3dba75b1fd1c26193ca4ffc6c4bad>.
- **Open access:** no — IEEE paywalled. Link only; no PDF committed. An author's
  dissertation covering the same work is at
  <https://digitalcommons.latech.edu/dissertations/311/> (not fetched this session).
- **Read-status:** skimmed — abstract and results summary read this session (2026-08-02)
  via the Semantic Scholar / search index; full text NOT read. Every number below is an
  abstract-level claim, not a figure read from a table.

## Key claims

- The attack is a **sample-level forgery**: snoop real keystroke latencies from a victim,
  synthesize (forge) new sequences matching that distribution, then replay them against the
  verifier. It is not specific to any one verification method and can be launched with
  off-the-shelf keyloggers and keystroke-synthesis APIs (abstract).
- **Success rate up to 87.75%** against verifier configurations, using forgeries built from
  **as few as 50-200 snooped keystrokes** (abstract). The attack remained effective with as
  little as 20-100 snooped keystrokes (abstract).
- Tested against **four state-of-the-art verification methods, three keystroke-latency
  types, and 11 matching-pair settings** — all were susceptible (abstract).
- Authors' conclusion: "typing biometrics are not robust against practical forgeries and
  should not be given the same weight as other authentication factors" (abstract).

## Relevance to this repo

This is the peer-reviewed version of what `bobbiechen` demonstrated live against this
library (`research/field-reports/2026-08-02-hn-forgery-critique.md`). The mechanism is
identical: sample from a human latency distribution, replay it, defeat the detector. It
matters for three concrete things:

- It puts a **published ceiling** under this library's thesis. If forging *per-user*
  latencies defeats supervised verifiers at ~88%, forging *population-average* latencies to
  defeat six unsupervised heuristics is strictly easier. The `replayBot` fixture
  (`tests/fixtures/bot-profiles.ts:57`) is the crudest form of this attack and already
  clears 0.70 (`research/experiments/2026-08-02-bot-fixtures-vs-human-threshold/`).
- It is direct evidence for the research program's framing: the goal is **raising forgery
  cost**, not preventing forgery. Snoop-Forge-Replay says a determined attacker with a
  keylogger wins; the useful question is how many signals a *cheap* attacker must model.
- It names the one signal in this repo that a pure replay attack cannot fake for free:
  anything the attacker did not snoop. The replay of dwells+flights carries no corrections
  and no rollovers, which is exactly why `rolloverRate` (weight 0.25) and `correctionRatio`
  matter — and exactly why the `NO_DATA` abstention on those two metrics
  (`src/analyzer.ts:193,241`) is the hole worth closing (see
  `research/experiments/2026-08-02-rollover-abstention-hole/`).
