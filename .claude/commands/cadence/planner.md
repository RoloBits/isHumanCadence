---
description: >-
  Stress-test a plan for `@rolobits/is-human-cadence` before anyone builds it. Runs `api-steward`
  (is this the right shape for a published library) and `browser-expert` (will the browser, the
  bundler and npm actually do this) independently and blind, adds `cadence-core` only when the plan
  claims something about what `src/` does today, cross-examines them over up to three rounds, and
  returns one of three verdicts: SOUND, NEEDS ANSWERS, HAS PROBLEMS. It reviews plans; it never
  writes one and never edits a file.
  Do NOT invoke for: writing the plan (`superpowers:writing-plans` owns that), deciding what to
  build at all (`superpowers:brainstorming`), implementing an approved plan (`/cadence:build`),
  reviewing a diff (`/code-review`), or deciding a release (`releasing` skill).
  Common triggers: "review this plan", "poke holes in this before I build it", "is this plan
  sound", "will this actually work in a browser", "does this break the API".
  <example>
  user: "Plan: swap the KS critical coefficient from 1.22 to 1.36 so spoof detection gets stricter.
  Files: src/anti-spoof.ts. Tests already cover it."
  assistant: runs the review, and returns HAS PROBLEMS — the plan retunes a calibrated constant and
  names no measurement that would confirm it, and the accuracy oracle (`validation/`, the Aalto
  168K benchmark) is gitignored and absent from the repo, so "tests still pass" means only that the
  synthetic seeded fixtures in `tests/analyzer.test.ts` still pass.
  <commentary>The right answer names the missing evidence and the experiment that would supply it,
  not a rewrite of the plan. A green suite over synthetic fixtures is not an accuracy result, and
  saying so is the whole point of the run.</commentary>
  </example>
  <example>
  user: "/cadence:planner docs/plans/2026-08-02-pointer-events.md"
  assistant: reads the file, restates it, and returns NEEDS ANSWERS with two questions: does adding
  a pointer channel still satisfy "timing only, never content", and is this a `feat:` (minor) or a
  `feat!:` (major) given `KeystrokeEvent` gains a field.
  <commentary>Questions of intent go to the developer, never to a reviewer. The release impact is
  part of the plan whether the plan says so or not.</commentary>
  </example>
argument-hint: '<a plan: inline text, or a path to a plan file>'
---

You are running the `/cadence:planner` review on behalf of a developer.

Their input is: `$ARGUMENTS`

If `$ARGUMENTS` is empty, stop immediately and print:

```
Usage: /cadence:planner <a plan — inline, or a path to a file>

Examples:
  /cadence:planner docs/plans/2026-08-02-pointer-channel.md
  /cadence:planner add a `reset()` to the observer that clears both ring buffers and the counters
  /cadence:planner retune DEFAULT_WEIGHTS so flightFit carries less of the score

Reviewers argue about it:
  api-steward     — is this the right shape, and what does it do to the public API and the version
  browser-expert  — will the browser, the bundler and npm actually do this
  cadence-core    — only if the plan claims something about what src/ does today

You get one of:
  SOUND           — build it
  NEEDS ANSWERS   — questions only you can answer
  HAS PROBLEMS    — it contradicts the record or rests on an unverified claim
```

This command **reviews** plans. It does not write them — that is `superpowers:writing-plans` — and it does not implement them.

---

## Round 0: Normalise the plan

Read it (open the file if given a path) and restate it in a form the reviewers can attack. If the plan is vague, say so now rather than reviewing a guess.

Extract and state explicitly:

- **Goal** — one sentence.
- **What this plan ships.** There is no roadmap document in this repo, so the question is not "which phase" — it is what reaches npm when this lands. State three things:
  - the **commit type** the plan implies (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, or a `BREAKING CHANGE:` footer),
  - the **version bump** that follows from it (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE:` → major, anything else → nothing ships),
  - and **whether the plan says so itself**.

  A plan that changes `src/` and never states its release impact **is itself a finding**. So is a plan whose stated release impact does not match its diff, in either direction: a plan that changes only `examples/` and implies `feat:` or `fix:`, or a plan that touches `src/` and describes itself by the demo it also touches. The second is the shape that already shipped — `f9fab4b`, subject `fix(demo): add metric sparkline cards…`, also changed five files under `src/`, adding the `recordEvents` option and the exported `KeystrokeEvent` type, and published as **1.4.1, a patch**. A new public option and a new public type arrived under a changelog entry about the demo. Nothing errored and nobody was told.
- **What changes** — files, exports, types, entry points (`.`, `./react`, `./vue`), the demo.
- **What it assumes** — every load-bearing claim, especially about what a browser, a bundler or npm does. This list is the main input to the platform reviewer.

Also check the plan's *shape* against `superpowers:writing-plans`: does it have a goal, a file map, right-sized tasks with independently testable deliverables, and stated global constraints? A plan can be perfectly on-thesis and still be unbuildable because it is one giant undifferentiated task. **Report shape problems separately from content problems — they have different fixes.**

## Round 1: Independent review, in parallel, no cross-talk

Spawn the reviewers **at the same time, each blind to the other**, with the **Agent** tool. This ordering is deliberate: if one sees the other's findings first, it anchors on them, and you get agreement that looks like corroboration but is not.

**`api-steward`** — ask for:
- Verdict: on-thesis / off-thesis / cannot tell.
- Does it contradict a non-goal, a stated principle, or a decision already made? Name which.
- What does it do to the **public API**: a new export, a changed type, a widened return. Does the same list of types still appear in all three of `src/index.ts`, `src/react/index.ts` and `src/vue/index.ts`?
- Is the implied **semver** bump the right one, and does the plan carry the commit message that produces it?
- What is missing from a consumer's view — a capability one adapter gets and the others do not, a state a caller cannot observe.
- **Questions for the platform reviewer**, if any.
- **Questions for the developer** — things only they can answer.

**`browser-expert`** — ask for:
- Verdict: the platform does this / does not / needs measuring.
- For every assumption from Round 0: is it **[D]** documented, **[M]** measured on this machine, **[D+M]** both, or neither? **Neither is a finding on its own.**
- What will fail *silently*: an SSR import that only breaks in a server component, a bundle-size regression that ships green because `npm run size` runs nowhere, a passive-listener or timer-resolution assumption that holds in jsdom and not in Safari.
- Cheaper or more reliable mechanism available?
- **Questions for the API reviewer**, if any.
- **Questions for the developer**.

**`cadence-core` — conditional.** Spawn it in this same parallel batch **only if the plan makes a claim about what this repo's code currently does** ("the observer already filters modifier keys", "`analyze` drops NO_DATA metrics from the denominator", "there is a test for the Vue composable"). Then ask for exactly one thing: is each such claim true, with a `file.ts:line` cite, or is it *not settled in the code*.

Do not spawn it for a pure-direction plan. A plan that argues about what the package should be does not need a code consult and should not pay for one.

The seam this closes is real: Keeps' planner had no equivalent and deliberately did not know about `keeps-core`, so a plan built on a wrong description of the current code passed review on the strength of the description. Closing it is cheap; leaving it open is not.

Each reviewer returns: verdict, findings ranked by severity, and its questions. Findings must cite a source — a doc line, a measured result, a `file.ts:line`, a named decision. **An uncited finding is an opinion and is labelled as one.**

## Round 2: Cross-examination

Spawn the same reviewers again. Each now receives:

- its own Round 1 output,
- the others' full findings,
- the questions **addressed to it**.

Each must:

1. **Answer** the questions put to it, from its own domain.
2. **Say which of the others' findings it accepts**, and which it disputes — with a reason, not a vibe.
3. **Revise its own findings** in light of what it learned. **Withdrawing a finding is a good outcome, not a loss.**

The most valuable thing this round produces is the finding no reviewer could have reached alone: an API decision that is clean in principle and impossible in a browser, or a platform capability that is real but would ship the wrong package.

## Round 3: Only if something is still open

Run a third round **only** for the specific points still in dispute — not the whole plan again. Give each reviewer the exact disagreement and ask it to argue its side and state **what evidence would change its mind**.

**Stop at three rounds. Do not force agreement.** Easy questions converge in round 1; genuinely hard ones may not converge at all, and a manufactured consensus is worse than an honest split because it hides the decision from the person who should be making it. If they still disagree, that is the output: name the crux in one sentence, give both positions with their reasons, and hand it to the developer.

Stop early when: the reviewers agree, or a round produces nothing new. **Repetition is a termination signal.**

## Round 4: Judge and verdict

You are the judge. You did not review; you weigh what the reviewers produced.

- **Weight the platform reviewer on facts, the product reviewer on direction.** `browser-expert` is authoritative on what a browser, a bundler or npm does and merely opinionated about what the package should be. `api-steward` is authoritative on shape, semver and thesis and merely opinionated about platform behaviour. `cadence-core` is authoritative on one thing only: what a line of `src/` says today. Each is authoritative in its own lane and merely opinionated outside it.
- **Treat every finding as a claim, not a fact.** Check the load-bearing ones against the source yourself. A confident reviewer can be wrong, and a plan changed on a wrong report is worse than the original.
- **Escalate two classes above everything else. Either one blocks.**

  1. **A browser behaviour that is documented but never measured.** If the plan rests on a `[D]`-only claim, it does not pass — it goes back with the experiment that would settle it. The reason is specific and not hypothetical: `browser-expert` in this repo has an **empty `[M]` column by its own admission**, and the whole product rests on millisecond timing that browsers **deliberately coarsen** for fingerprinting reasons. A documented timer resolution is a statement about a spec, not about the number this library will actually read on a user's machine.

  2. **A retune of a constant in `src/analyzer.ts` or `src/anti-spoof.ts` with no named measurement.** `DEFAULT_WEIGHTS`, `KS_CRITICAL_COEFF`, the thresholds — a plan that changes one of these and does not name the measurement that would confirm it does not pass. The accuracy oracle does not exist in a clone: `validation/` is **gitignored and absent**, the Aalto 168K benchmark lives only on the developer's machine, `tsx` is not even in `devDependencies`, and `extract:aalto` / `validate:aalto` therefore cannot run. "The tests still pass" means only that the **synthetic seeded fixtures** still pass. That is a regression guard, not an accuracy result, and it cannot tell the difference between a better calibration and a worse one.

Then pick exactly one:

| Verdict | When | What the developer gets |
| --- | --- | --- |
| **SOUND** | No blocking findings. Assumptions are [M] or [D+M], or their risk is stated and accepted. The release impact is named. | Build it. Plus any non-blocking notes. |
| **NEEDS ANSWERS** | Nothing is wrong, but questions remain that only the developer can answer. | The questions, one at a time, each with options and a recommendation. |
| **HAS PROBLEMS** | It contradicts the record, rests on an unverified platform claim, retunes a constant with no oracle, or the reviewers found a real conflict. | Each problem, its source, and the smallest change that would fix it. |

A plan can be **on-thesis and still have problems**, or **off-thesis and technically flawless**. Say which, separately. Collapsing the two is the most common way this kind of review goes wrong.

## Round 5: Report

```
VERDICT: <SOUND | NEEDS ANSWERS | HAS PROBLEMS>

Plan: <one-line restatement>
Ships: <commit type> → <version bump, or "nothing"> — <stated in the plan | not stated>

API (api-steward):        <verdict, one line>
Platform (browser-expert): <verdict, one line>
Code (cadence-core):      <verdict, one line — or "not consulted: no claim about current code">

Shape (per superpowers:writing-plans):
  <shape problems, or "fine">

Findings, worst first:
  <severity> <finding> — <source> — <smallest fix>

Assumptions and their standing:
  <assumption> — [D] / [M] / [D+M] / unverified

Unresolved between the reviewers:
  <the crux in one sentence, both positions, what would settle it>

Questions for you:
  <one at a time, with options and a recommendation>
```

If the verdict is SOUND, **say so plainly and stop. Do not manufacture findings to look thorough — a review that always finds something teaches the developer to ignore it.**

---

## Guard rails

- **This command changes nothing.** No files written, no commits, no code. It returns a verdict.
- **Round 1 is blind.** Never show one reviewer another's output before all have answered independently.
- **Spawn `cadence-core` only when the plan claims something about current code**, and ask it only whether that claim is true.
- **Never force convergence.** An honest disagreement, clearly stated, is a valid and useful result.
- **Questions of intent go to the developer, never to a reviewer.** The agents may settle facts between themselves; they may not decide what the developer wants.
- **Every finding cites a source** — a doc line, a measured result, a `file.ts:line`, a named decision. Uncited findings are labelled opinion.
- **A documented-but-unmeasured browser claim blocks the plan** and comes back with an experiment attached — named as a task for the `researcher` agent, which runs experiments and records them under `research/`.
- **A retuned constant with no named measurement blocks the plan.** The Aalto oracle is not in the repo.
- **Name what the plan ships.** Commit type, version bump, and whether the plan said it. Silence about release impact is a finding.
- **Verify a load-bearing finding yourself before acting on it.** Reviewers can be confidently wrong.
- Three rounds maximum. Repetition means stop.
- Do not invent severity to justify the run.

## What this command is NOT

- **Not a plan writer.** `superpowers:writing-plans` writes plans; bring the result here.
- **Not a brainstorm.** If the plan does not exist yet, `superpowers:brainstorming` comes first.
- **Not an implementer.** `/cadence:build` comes after a SOUND verdict.
- **Not a code review.** It reviews the plan, not the diff — `/code-review` does that.
- **Not the release decision.** What actually gets published, and with which commit type, belongs to the `releasing` skill.
- **Not a rubber stamp.** SOUND is a real outcome and should be reachable, but only when nothing was found.
