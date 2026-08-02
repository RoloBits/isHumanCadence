<!--
Agents and people are both welcome here. See AGENTS.md for the full contract.
Delete any section that genuinely does not apply — but do not delete the
Evidence section on a change that touches scoring.
-->

## What changed

<!-- One paragraph. What does the code do differently, and why. -->

## Release impact

<!--
The commit type IS the release decision — semantic-release publishes to npm on
merge. Tick one.
-->

- [ ] Publishes nothing (`chore:` / `docs:` / `test:` / `ci:` / `refactor:`)
- [ ] `fix:` / `perf:` — patch
- [ ] `feat:` — minor
- [ ] `BREAKING CHANGE:` footer — major

If this moves scores for existing consumers without changing any type
signature (a retuned weight, a moved threshold, a changed default), say so
here. That is a user-observable change even though nothing fails to compile.

## Evidence

<!--
Required for anything touching scoring behaviour.

`npm test` passing is NOT evidence of accuracy. The suite runs against
synthetic seeded fixtures this repo wrote to match its own model of a human,
and every candidate so far has looked free on those fixtures while costing
real humans on the real corpus.

Paste the literal output of `npm run bench` (see bench/ for setup), before and
after. Both error rates, or it is not an improvement — it is a trade.
-->

**Human false positives** (real CMU corpus — the fraction of real people who
lose the confident-human verdict):

```
before:
after:
```

**Bot false negatives** (the fraction of forgers that still pass):

```
before:
after:
```

**What this does not show:**

<!--
State the limits honestly. Which rung of the evidence ladder is this — in-repo
fixtures, synthetic sweep, real corpus, live browser? A result on synthetic
bots is a fact about the generator, not about real automation.
-->

## Checks

- [ ] `npm run check` passes locally (typecheck, lint, test, build)
- [ ] New behaviour has a test; behaviour I deliberately left alone is noted
- [ ] No new runtime dependency (this package ships zero)
- [ ] Public API changes are exported from **all three** entry points
      (`src/index.ts`, `src/react/index.ts`, `src/vue/index.ts`) — see
      `.claude/skills/public-api/SKILL.md`
- [ ] No key identity, key codes, or text content is captured anywhere
      (timing only — this is the product's one hard line)

## Notes for the reviewer

<!--
Anything you decided not to do, anything you are unsure about, any finding you
turned up but did not act on. A named open question is worth more than a
tidy PR that hides it.

A core-logic PR gets an automatic preview comparing main's engine against this
branch on the same keystrokes — the bot will comment the URL.
-->
