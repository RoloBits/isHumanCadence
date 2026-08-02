---
description: "Build one thing end to end in @rolobits/is-human-cadence: ground the plan in what src/ actually does with cadence-core, write it to a local plan file that names the commit type and the version it will produce, hand it to /cadence:planner, STOP for the developer to approve the plan, implement against npm run check, STOP again before anything reaches main — because a push to main runs release.yml and publishes to the public npm registry. Two human gates, neither skippable, and the second one publishes. Do NOT invoke for: reviewing a plan that already exists (/cadence:planner owns that), producing accuracy or browser evidence (/cadence:evidence owns that), a scope or semver or thesis question with no change to make yet (the api-steward agent owns that), or writing a worklog entry on its own (/worklog owns that). Triggers: 'build X', 'implement X', 'fix the X bug', 'add X to the observer', 'ship a patch for X'."
argument-hint: '<what to build — a one-line description, or a GitHub issue number/URL>'
# Writes code and can publish to the public npm registry. Only a human starts this.
disable-model-invocation: true
---

You are running the `/cadence:build` workflow on behalf of a developer.

Their input is: `$ARGUMENTS`

If `$ARGUMENTS` is empty, stop immediately and print:

```
Usage: /cadence:build <a one-line description, a GitHub issue number, or an issue URL>

Examples:
  /cadence:build corrections should not increment before the ke.repeat early-return
  /cadence:build 7
  /cadence:build https://github.com/RoloBits/isHumanCadence/issues/7

Plan first, reviewed by /cadence:planner, approved by you, then built.
Nothing reaches main — and nothing publishes to npm — until you say so a second time.
```

## The two gates, and why the second one is sharp

1. **The plan gate (Step 7).** No code is written until the developer has read the plan and said yes. A plan is a paragraph to rewrite; an implementation is a day to throw away. `/cadence:planner` argues with the plan first so the developer reads a stress-tested one, not a first draft. The plan also names the **commit type**, which is the release decision — see below.

2. **The release gate (Step 11).** `git push origin main` triggers `.github/workflows/release.yml`, which ends in `npx semantic-release` and **publishes to the public npm registry** under `NPM_TOKEN`. There is **no branch protection on `main`** and no ruleset — CI is advisory and a red build blocks nothing. So the push is not "the first thing that leaves this machine"; it is a version other people install. npm unpublish is effectively unavailable after 72 hours.

**The commit message is the release decision, and it is made at the plan gate.** `feat:` → minor, `fix:` → patch, a `BREAKING CHANGE:` footer → major, anything else → nothing ships. By the time you are typing `git push` the decision is already encoded in a commit message that has been written. That is why the plan carries a *Release impact* section, why the plan gate states it out loud, and why the release gate confirms it against the real `semantic-release` output rather than a prediction.

On "no" at either gate: stop where you are. The branch, the commits and the plan file stay local, and you say plainly what exists on disk so the developer can pick it up or delete it. Never soften a cancel into "I'll just finish this one part".

---

## Step 1: Resolve the task

**There is no tracker.** No Linear, no issue key convention, no status to claim, nothing to transition. `$ARGUMENTS` is free text. The one structured form is a GitHub issue on `RoloBits/isHumanCadence`:

- Matches `^\d+$` → an issue number. `gh issue view <n> --repo RoloBits/isHumanCadence --json title,body,state,labels,comments`
- Contains `github.com/RoloBits/isHumanCadence/issues/<n>` → same, with the number extracted.
- Anything else → a free-form description. The run continues. Do not stop to ask for an issue.

With an issue: if its state is `CLOSED`, ask before continuing. There is nothing else to check — no blockers, no relations, no assignee signal.

Restate the task in one short paragraph. If it is too vague to plan against, ask exactly **one** question and stop.

### Then: is it buildable at all?

This check happens **here**, before a branch exists.

| What it is | How you can tell | Where it goes |
| --- | --- | --- |
| Needs a real browser, a real device, or a real accuracy measurement | "does this work in Safari", "is the score still accurate after retuning X", anything whose criteria are observed rather than asserted | `/cadence:evidence` |
| A design or direction question | asks whether something should exist, what the API should look like, whether a non-goal still holds | `/cadence:planner` once there is a plan, or the `api-steward` agent for the question itself |
| A change to files in this repo | files change and `npm run check` can see the difference | here |

Not buildable → **name the command or agent that owns it and stop.** Do not branch, do not write a plan.

The trap worth naming: a retune of a constant like `DEFAULT_WEIGHTS` (`src/analyzer.ts:20`) *looks* buildable, because the file changes and the suite runs. It is not. Those weights were calibrated on the Aalto 168K benchmark, and the scripts that run it (`extract:aalto`, `validate:aalto`, `package.json:48-49`) point at `validation/`, which is in `.gitignore:8` and absent from the clone — `tsx` is not even in `devDependencies`. A retune cannot be re-validated here. It goes to `/cadence:evidence`.

## Step 2: Pre-flight

All five, in order. Any failure stops the run — do not proceed quietly.

1. `git status --porcelain` is clean. **A dirty tree has one recovery and it is not "carry on":** print what is dirty, tell the developer to commit it or `git stash` it, and re-run this command. Do not stash it for them and do not build around it.
2. Current branch is `main`, and `git pull --ff-only` succeeds. The release no longer commits anything back to `main` — `@semantic-release/changelog` and `@semantic-release/git` were removed on 2026-08-02 — so `main` only moves when a pull request merges. If `--ff-only` refuses, someone merged a PR since your last pull; that is normal, not a conflict.
3. **Not a shallow clone** — `.git/shallow` must not exist. Steps 9, 11 and 13 all read `main..HEAD`; on a truncated history that range is wrong, and wrong silently.
4. `gh auth status` is authenticated for `RoloBits/isHumanCadence`.
5. **`npm run check` is green before you touch anything.** That is `npm run typecheck && npm run lint && npm run test && npm run build` (`package.json:45`). **Read the real test count out of that run and carry it forward — never a number from this file or from memory.** This command's own rule adds a test per new behaviour, so any hardcoded count is stale the first time it is right. A red baseline means the next failure tells you nothing.

### The toolchain that actually exists

Unlike some repos, this one has a real multi-gate toolchain. Use it; do not invent a step next to it.

| Gate | Command | Where it runs |
| --- | --- | --- |
| Types | `npm run typecheck` (`tsc --noEmit`) | `ci.yml:20` — **not** in `release.yml` |
| Lint | `npm run lint` (`eslint src/ tests/`) | `ci.yml:21`, `release.yml:28`, pre-commit on staged files |
| Tests | `npm test` (`vitest run`) | `ci.yml:22`, `release.yml:29` |
| Build | `npm run build` (`tsup`) | `ci.yml:23`, `release.yml:30` |
| All four | `npm run check` | locally, and as `prepublishOnly` |

**`release.yml` does not run `npm run typecheck`.** A type error fails CI and publishes anyway. Say that at the release gate.

**Not a gate anywhere:** coverage (`test:coverage` exists and nothing runs it), bundle size (`npm run size` exists and is in neither `check` nor CI, so a regression past the `<3KB gzip` claim in `package.json:4` ships green), and the Aalto accuracy benchmark (see Step 1).

**`npm test` green is a precondition, never a verdict on accuracy.** The suite runs against synthetic seeded fixtures under `tests/fixtures/`, not against human typing. It proves the code does what the tests say. It says nothing about whether the score is right.

**There is a git hook and it is not yours to bypass.** `lefthook.yml` runs `npx lint-staged` pre-commit on staged `*.{ts,tsx}`, which runs `eslint --max-warnings 0 --no-warn-ignored` (`.lintstagedrc.json:2`). The two `warn` rules — `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-non-null-assertion` (`eslint.config.js:17,22`) — therefore **block a commit but not CI**. A commit rejected for a warning is the hook working. Fix the warning. Never `--no-verify`.

## Step 3: Branch

```
fix/observer-corrections-before-repeat-return
```

- Prefix is one of `feat|fix|docs|chore|refactor|test|perf`, picked by what the change **is**. It is the same word you will use in the commit subject, so choosing it here is the first half of the release decision.
- Then 3-5 dash-separated words, lowercase alphanumeric and dashes, whole thing capped at 50 characters.
- No timestamp suffix. One developer, one machine.

`git checkout -b <branch>`. Nothing is pushed here.

**There is no branch-name enforcement in this repo** — `lefthook.yml` checks nothing but lint-staged, and there is no hook refusing a commit on `main`. The convention is yours to keep, and so is not committing to `main` directly. Say so if the developer asks why you branched when nothing made you.

## Step 4: Ground the plan in what the code actually does

Before drafting anything, find out what is already there. All three sources are read-only.

**`cadence-core`, via the `Agent` tool** — for anything touching `src/` or `tests/`. It reads the library and cites `file.ts:line`.

Ask it for what this change needs, not a tour. **The first question is always the reuse question** — a second copy of something that already exists is the cheapest failure to catch and the most expensive to unwind:

- Does something in `src/` or `tests/` already do this, or most of it? Name it with a cite. If it does, the plan extends that thing; it does not add a parallel one. (Outside `src/` and `tests/` — a config, a workflow, a skill — `cadence-core` does not answer; grep for it yourself, and answer it before designing either way.)
- What does the code do today at the place I am about to touch, with line cites?
- Which invariant does this change sit next to, and what breaks silently if I get it wrong?
- Which existing test pins the current behaviour, so I know what will go red?

**`browser-expert`, via the `Agent` tool** — only when the change rests on a browser, bundler or npm behaviour: event timing, `passive` listeners, SSR and no-DOM safety, tree-shaking, `exports` map resolution, `d.ts` emission. It tags every claim `[D]` documented / `[M]` measured / `[D+M]` both, and it says *"neither documented nor measured"* rather than guessing. Take that answer at face value and put it in the plan as an open question, not as a fact you smoothed over.

**`api-steward`, via the `Agent` tool** — only when the change touches the **public API surface**, a **default constant**, or the **thesis** (timing only, never content). Not routinely: a bug fix inside a settled contract does not need a semver opinion. It asks questions rather than assuming, so expect a question back.

**Do not hand an agent a question it disclaims.** `cadence-core` for `src/` and `tests/`; `browser-expert` for the platform; `api-steward` for API shape, semver and non-goals. When a question crosses two of them, split it and ask both.

**A question an agent asks back is not yours to close silently.** Answer it from the task where the task answers it — then write the question **and** your answer into the plan's *Assumptions* as a stated assumption, and show both at the Step 7 gate. Where the task does not answer it, it goes to the gate as a question for the developer. The failure this prevents is the whole review collapsing into your own verdict: the developer reads one line and has nothing left to disagree with. Same rule for the planner.

Timebox the whole step. One `cadence-core` consult, at most one other agent, a handful of greps.

## Step 5: Write the plan file

```
docs/plans/<YYYY-MM-DD>-<branch-slug>.md
```

`mkdir -p docs/plans` if it is missing — **there is no `docs/` directory in this repo yet, and `docs/` is NOT in `.gitignore`** (verified 2026-08-02: `.gitignore` lists `node_modules`, `dist`, `coverage`, `*.tsbuildinfo`, `.DS_Store`, `.lefthook/`, `.validation/*`, `validation/` — and nothing else). So the plan file **will** show up in `git status` and **can** be committed by accident.

Two ways to handle that, and you pick one and say which at the gate:

- Add `docs/` to `.git/info/exclude` — local, untracked, nothing committed, and the exclude file is not part of the repo so it does not change what anyone else sees.
- Or accept that the file is tracked and commit it deliberately with the change.

Either way: **always `git add` with explicit paths, never `git add .` and never `git add -A`.** And at the Step 7 gate, state plainly whether the plan file is tracked or excluded, so the developer knows whether it is about to be published inside a tarball. (It would not be — `package.json:33-35` ships `dist` only — but it would be in the git history and the GitHub repo forever.)

Fill every section:

```markdown
# <one-line title — a name for the change, not a filename>

**Branch:** <branch>
**Issue:** <#7 + URL, or "no issue">
**Plan file:** <tracked | excluded via .git/info/exclude>
**Status:** awaiting review

## What we're doing
<1-2 paragraphs. Who it is for, what outcome, why now.>

## What the code does today
<From cadence-core, with its file.ts:line cites kept verbatim. This is the section that
stops the reviewers arguing about a codebase that does not exist.>

## How we're doing it
<Concrete steps. Files, functions, types, tests. Right-sized tasks, each independently
checkable with npm test.>

## Assumptions
<Every load-bearing claim. Tag each [D] documented / [M] measured on this machine /
unverified. Include every question an agent asked back, with the answer you took from
the task and where you took it from. The planner attacks this list hardest.>

## Invariants this must not break
<From cadence-core. For each one, name the test that would go red — or say plainly
that nothing would, which is the more common and more dangerous answer here.>

## Release impact
**Commit type:** <feat | fix | docs | chore | refactor | test | perf | + BREAKING CHANGE footer>
**Version this produces:** <minor | patch | major | nothing publishes>
**What a consumer would observe:** <the actual behaviour change someone who runs
  `npm i @rolobits/is-human-cadence` would see — or "nothing, this publishes no library change">

## Out of scope
<Explicitly not in this change.>

## Risks
- Risk: <X>. Mitigation: <Y>.

## Acceptance criteria
<Observable behaviour. Not "tests pass", not "merged" — those are steps, not outcomes.>

## Files expected to change
- <path> — <reason>

## Open questions
<Numbered. Empty if none.>
```

**Release impact is the most important section in the file.** It is where the version gets decided while it is still a sentence someone can argue with. Every other section describes the change; this one describes what strangers install because of it.

## Step 6: Hand it to `/cadence:planner`

`/cadence:planner` already does the plan-stress-test job and this command does not rebuild it. Invoke it with the `Skill` tool: `skill: "cadence:planner"`, `args: "docs/plans/<file>.md"`.

It changes nothing — acting on the verdict is your job:

| Verdict | What you do |
| --- | --- |
| **SOUND** | Go to the gate. Carry any non-blocking notes into the gate summary. |
| **NEEDS ANSWERS** | Do not answer them yourself. Carry the questions to the gate verbatim, one at a time, with the planner's own options and recommendation. |
| **HAS PROBLEMS** | Revise the plan file against each problem and re-run the planner on the same path. **Cap at two re-runs.** Still failing → take it to the gate as a problem, not as a plan. |

If a planner finding turns on what `src/` actually does, re-consult `cadence-core` on that one point before revising, and put its answer in the revision. Step 4 runs first for exactly this reason: the reviewers argue about the real codebase instead of a plausible one, so a plan that misreads `src/` fails at the gate rather than at the keyboard.

## Step 7: Plan gate — STOP and ASK

Nothing has been written yet. The branch is local and empty.

```
### Plan ready for your review

**Task:** <restated, one line>
**Issue:** <#7 | no issue>
**Branch (local, empty):** <branch>
**Plan:** docs/plans/<file>.md — <tracked in git | excluded via .git/info/exclude>

**Planner verdict:** <SOUND | NEEDS ANSWERS | HAS PROBLEMS>
  Grounding (cadence-core): <one line — what it said the code does today>
  Platform (browser-expert): <one line, with its [D]/[M] tags | not consulted>
  API (api-steward): <one line | not consulted — this touches no public surface>

<the plan in full if short, otherwise: What we're doing / How we're doing it /
 Release impact / Acceptance criteria / Files expected to change, inlined>

**Release impact:** <commit type> → <version bump> → <what publishes to npm, or
  "nothing publishes">

**Findings still open:** <each with its source and the smallest fix, or "none">
**Assumptions I stated on your behalf:** <every question an agent asked back, with the
  answer I took from the task and where I took it from, or "none". Say "disagree with <n>"
  to overturn one.>
**Questions only you can answer:** <one at a time, with options and a recommendation>

**What you can do:**
- Reply 'approved' (or 'lgtm' / 'yes') → I'll start building
- Reply 'change <section>: <what>' → I'll revise the plan and re-present
- Reply 'answer: <X>' → I'll fold it in and re-present
- Reply 'rerun planner' → I'll send the revised plan back through /cadence:planner
- Reply 'cancel' → I'll stop. Branch and plan stay local, nothing is published.
```

Then STOP and wait. **No code before an unambiguous yes.** Set `**Status:** approved` in the plan file when it comes.

## Step 8: Build it

Work the plan's steps in order. After each one:

```bash
npm test
```

Before the commit, the full gate:

```bash
npm run check
```

A new behaviour gets a test in the matching `tests/*.test.ts` — the suite is the executable half of this project's specification, and `cadence-core` cited the tests that pin what you are touching for exactly this reason.

Rules while building:

- **Stay inside the plan.** A step the plan did not name is a change of plan: say so and go back to the gate. Do not quietly widen the diff.
- **The plan file is not an output.** Do not update it as you go beyond `Status`; it recorded what was approved.
- **If the plan turns out to be wrong**, stop and say so rather than improvising around it. A wrong plan discovered at step three is cheap; discovered after a publish it is not.
- **No secrets on disk or in a commit.** No `NPM_TOKEN`, no `GITHUB_TOKEN`, no absolute home paths. This repo is public and so is the package.

## Step 9: Local review before you show it

Before the release gate, two cheap passes on the diff — both local, nothing published.

1. **`simplify`**, via the `Skill` tool, on the working diff. Run `npm test` after anything it applies.
2. **`cadence-core` again**, via the `Agent` tool, given `git diff main..HEAD -- src tests`. **Only those paths** — it owns `src/` and `tests/` and will hand back a diff spanning `.github/` or `examples/`. If that diff is empty, skip the pass and say so. One question: does this diff break an invariant, and which line says so.

**Apply `simplify`; do not act on `cadence-core`.** `simplify` is mechanical cleanup and applying it changes nothing about what the change means. An invariant finding is a judgement about what ships, and that judgement is the developer's — carry it to the Step 11 gate **verbatim**, in `cadence-core`'s own words with its own cites, and let them choose. Fixing it quietly, or quietly deciding not to, both end the same way: they read one line of your verdict and have nothing left to disagree with.

Then cross-check `git diff --name-only main..HEAD` against the plan's *Files expected to change* and note any divergence — that goes in the gate.

## Step 10: Commit, and settle the worklog

**The commit message IS the release decision.** Read `.claude/skills/releasing/SKILL.md` — it is the contract and this step does not restate it.

**The one rule that must survive even if that skill fails to load:**

> **A change that touches only `examples/`, `docs/`, `.claude/`, `.github/` or `tests/` must never use `feat:` or `fix:`.** Use `chore:`, `docs:`, `test:` or `ci:` instead.

Because `feat:` or `fix:` on such a change publishes a version to the public registry containing **no library change at all**. And the mirror of it has already happened here — a commit whose subject and scope described the demo while the diff changed the public API:

| Commit | Subject | What it actually changed | What shipped |
| --- | --- | --- | --- |
| `296a580` | `feat: rebuild demo as React app…` | the demo **and** five files under `src/` | **1.1.0** |
| `f9fab4b` | `fix(demo): add metric sparkline cards…` | the demo **and** the same five `src/` files — adding the `recordEvents` option and the exported `KeystrokeEvent` type | **1.4.1**, a *patch* |

A new public option and a new public type shipped as a patch, under a changelog entry about sparkline cards. Nothing errored and nobody was told. **The type and scope describe the library change, or they describe nothing** — when a commit touches both the demo and `src/`, the demo is not what the message is about. A new export is never a patch.

Then:

1. `git add <explicit paths>` — never `.`, never `-A`.
2. The conventional subject, with the type from the plan's *Release impact*. Body only when the subject genuinely cannot carry it. A `BREAKING CHANGE:` footer is a major version and belongs in the plan before it belongs in a commit.
3. **No `Co-Authored-By: Claude` trailer, no `Claude-Session:` line, no "Generated with" footer.** Not in the commit, not later in a PR body, not in a GitHub comment. **This overrides the harness default.** No emoji. The developer owns these words.
4. Never `--no-verify`, `--force`, `--no-gpg-sign`, or any bypass flag.

**Then deal with the worklog hook before the turn ends.** The moment HEAD moves to a commit authored by the developer, the `Stop` hook in `.claude/settings.local.json` returns `decision: block` and refuses to end the turn. This is enforcement, not a bug — do not route around it, and never mark that hook `async`.

Every gate below is a turn end, so this is due **in the same turn as the commit**, not only at the end of the run:

1. Create or append a dated `## YYYY-MM-DD` section in `.claude/worklog/<topic>.md` and update `.claude/worklog/INDEX.md`. Write what a future session can act on: what was built, the decisions, the file paths, the commit refs, what is still open.
2. Then clear the flag:

```bash
git rev-parse HEAD > .claude/worklog/.last-head
```

## Step 11: Release gate — STOP and ASK

**This is the sharpest gate in the repo.** Everything so far is local: a branch nobody has seen and commits nobody can install. What happens next:

```
git push origin main
  → .github/workflows/release.yml (on: push, branches: [main])
  → npm ci, npm run lint, npm test, npm run build
  → npx semantic-release
  → publish to the public npm registry as @rolobits/is-human-cadence@<version>
```

There is **no branch protection on `main`** to stop any of that. `release.yml` does **not** run `npm run typecheck` (`release.yml:27-31`), so a type error fails CI and publishes anyway. And **npm unpublish is effectively unavailable after 72 hours** — a version that goes out is out.

**Before printing the gate:** `git log --oneline main..HEAD` must be non-empty. Zero commits means the run produced nothing — report that instead of a gate, and never offer to push an empty branch.

**Get the version from `semantic-release`, never by predicting it:**

```bash
npx semantic-release --dry-run --no-ci --branches "$(git branch --show-current)"
```

Read the version out of that output. If it cannot run — it needs a `GITHUB_TOKEN` in the environment and may refuse without one — **say plainly that the version could not be computed**, show the commit subjects, and let the developer read the bump off them. A guessed version stated as fact at this gate is the worst thing you can put on the screen.

```
### Ready to land — this can publish to npm

**Task:** <one line>
**Issue:** <#7 | no issue>
**Branch (local):** <branch>
**Plan (approved):** docs/plans/<file>.md — <tracked | excluded>
**Diff:** <git diff --stat main..HEAD>

**Commits — full subjects, because these ARE the release decision:**
  <git log --format='%h %s' main..HEAD, every line in full>

**Version semantic-release computed:** <x.y.z, read from --dry-run output |
  "could not compute — <reason>; the subjects above are the decision">
**What that publishes:** <the library change a consumer would observe, or
  "nothing — this touches no shipped code">

**npm run check on this head:** typecheck ok / lint ok / <n> tests pass, 0 fail / build ok
**Note:** release.yml does not run typecheck. A type error fails CI and publishes anyway.

**simplify:** <what it applied, or "nothing">
**Plan vs implementation:** <"matches the expected files" | "diverged — expected A, got B, because C">

**cadence-core on the diff — its words, not mine:**
  <each finding verbatim, with its file.ts:line, or "no invariant at risk".
   I have fixed none of these.>

**What you can do:**
- Reply 'pr' → push the branch and open a PR. **Merging it is what publishes.**
- Reply 'fix now: <which>' → I'll fix it on this branch, re-run npm run check, and come back here
- Reply 'fix later: <which>' → I'll land it, and it goes in the final report as still open
- Reply 'as is: <which>' → your call that it is not a problem; nothing is recorded
- Reply 'show diff' → I'll print the full diff
- Reply 'cancel' → branch stays local, nothing is pushed, nothing is published

**My recommendation:** <'pr' — it is the only path; main refuses direct pushes. Say here whether
  the merge will publish, and which version.>
```

Then STOP and wait. **Land only on an unambiguous yes.** No `cadence-core` finding is closed by you; each one is closed by *fix now*, *fix later* or *as is*, in the developer's words.

**The honest claim, and do not soften it:** everything on this machine is reversible — the branch, the commits, the plan file, all of it. A publish is not.

## Step 12: Land it

Two sub-paths. **Do not chain the steps with `&&`** — each one has to be checked before the next runs.

### `ship it` — no longer possible, and say so plainly

**`main` refuses direct pushes.** Ruleset `protect-main` (id `20248773`, no bypass actors) requires a pull request, with `Test` as a required check. There is no admin override and no token in this repo that carries one.

If the developer says `ship it`, do not attempt the push. Tell them the rule exists, that landing on `main` is a PR merge now, and offer `pr` instead. Attempting it wastes a round trip and produces a rejection message that reads like a credentials problem when it is not.

### `pr`

1. Bind it once — `BODY="${TMPDIR:-/tmp}/cadence-pr-<branch-slug>.md"` — and write the PR body there, **outside the working tree**. Never inside the repo: it would appear in `git status` and could be staged.
2. `git push -u origin <branch>`
3. Verify: `git ls-remote --heads origin <branch>` returns a line. Empty → the push did not take; stop.
4. `gh pr create --title "<the commit subject>" --body-file "$BODY"`. **Not** a draft. The title matters: it is what a squash merge would put on `main`, and therefore what `semantic-release` would read.
5. Capture the URL: `gh pr view <branch> --json url,number`. **Empty URL → stop here.**
6. `rm -f "$BODY"`.

**Cleanup happens only on the whole path.** Any stop above leaves `$BODY` where it is on purpose, and you print its path so the developer can open the PR by hand. If step 3 passed and step 4 failed, say so first: the branch is public and there is no PR. Retry step 4 once. Still failing → hand over the branch name, the body-file path and the `gh` error. **Do not delete the remote branch to tidy up.**

The command never runs `gh pr merge` or `gh pr ready`. No bot attribution in the PR body, no emoji, no footer, no "Test plan" section, no secrets.

## Step 13: Converge on the landed head

A pass only counts against the head it ran on. Any commit made after a pass leaves a head nothing has cleared — which is why **both** passes run here and not only at Step 9. The Step 9 run fed the gate; this one checks what actually shipped.

1. `simplify` on `main..HEAD`, **and** `cadence-core` on `git diff main..HEAD -- src tests` when that diff is non-empty.
2. If `simplify` applied anything, or a *fix now* item is still open: `npm run check`, commit, go back to 1.
3. **A `cadence-core` finding the developer has not seen is not yours to fix here.** The gate is behind you and the choice was theirs. Note it and carry it to Step 14.
4. Done when one full pass applies nothing, no *fix now* item is still open, and `npm run check` is green on the landed head.

Cap at 3 iterations.

**This loop is cheap while the PR is open and expensive after it merges.** Commits pushed to the branch cost nothing — CI re-runs and nothing publishes. Once the PR merges, every further merge to `main` is another `release.yml` run: a `chore:` follow-up publishes nothing, a `fix:` follow-up ships a second version for the same piece of work. **Batch every fix into the open PR.** If something must be fixed after the merge, say what it will cost — a second version number, visible in the registry forever — and go back to the gate for it.

## Step 14: Report

```
### /cadence:build complete

**Task:** <one sentence>
**Issue:** <#7 | no issue>
**Branch:** <branch>
**Landed as:** <PR url | "merged to main">
**Published version:** <read from `gh run view` or
  `npm view @rolobits/is-human-cadence version` — never assumed |
  "nothing published — <why>" | "not yet, the PR is open">
**Plan:** docs/plans/<file>.md — <tracked | excluded via .git/info/exclude>
**npm run check on the landed head:** typecheck ok / lint ok / <n> pass, 0 fail / build ok

**Planner verdict:** <SOUND | the findings that were accepted and how>
**cadence-core:** <what was decided at the gate: fixed / deferred / accepted as is>
**simplify:** <what it applied across the loop, or "nothing">

**Still open:**
- <every 'fix later' finding, anything Step 13 raised after the gate, anything the loop
  did not converge on, or "nothing">

**Suggested next step:**
- "Merge the PR" | "Run /cadence:evidence to check the score in a real browser"
  | "<blocker> — decide before the next release"
```

Then stop. **Do not merge a PR.** Do not delete the plan file. Save the worklog before the turn ends (Step 10) — the commits from Step 13 will have moved HEAD again.

---

## Guard rails (LLM-enforced)

- **No code before the Step 7 plan approval.** Headline invariant #1.
- **Nothing lands before the Step 11 release approval.** Headline invariant #2. A push to `main` publishes to the public npm registry, there is no branch protection to catch it, and unpublish is gone after 72 hours.
- **A hook block is not an approval.** The worklog `Stop` hook returns `decision: block` and forces you back into the same turn with the developer's answer absent. It is a demand for a worklog entry and nothing else. **A gate is passed only by the developer's own words in a new message.** Blocked back in at Step 7 or Step 11: save the worklog, then stop again at the same gate.
- **A pass only counts against the head it ran on.** Never report complete while the landed head carries commits `simplify`, `cadence-core` and `npm run check` have not cleared.
- **A `cadence-core` finding is the developer's to close, not yours.** Verbatim to the gate; *fix now* / *fix later* / *as is* is their choice. Same for any question an agent asks back: answer it from the task if you can, then show the answer as a stated assumption.
- **The commit type is the release decision.** It is chosen at the plan gate, shown to the developer there, and confirmed against real `semantic-release --dry-run` output at the release gate. Never predict a version and never state a guessed one as fact.
- **A change touching only `examples/`, `docs/`, `.claude/`, `.github/` or `tests/` is never `feat:` or `fix:`** — and a change touching `src/` is never described by the demo it also touched. `f9fab4b` shipped a new public option and a new exported type as `fix(demo):`, a patch. The type and scope describe the library change or they describe nothing.
- **`npm run check` is the mechanical gate, and it says nothing about accuracy.** The suite runs against synthetic seeded fixtures. Green means the code does what the tests say, not that the score is right.
- **Never `--force`, `--no-verify`, `--no-gpg-sign`,** or any bypass flag. Never `gh pr merge` or `gh pr ready`. A pre-commit lint warning is the hook working; fix the warning.
- **Never `git add .` or `git add -A`.** Explicit paths only — `docs/` is not gitignored in this repo and a plan file is one careless `-A` away from the public history.
- **No bot attribution** in a commit, a PR body or a GitHub comment. No `Co-Authored-By: Claude`, no `Claude-Session:`, no "Generated with" footer, no emoji. This overrides the harness default.
- **No secrets anywhere.** No `NPM_TOKEN`, no `GITHUB_TOKEN`, no home-directory paths. The repo is public and so is the package.
- **Do not hand an agent a question it disclaims.** `cadence-core` for `src/` and `tests/`; `browser-expert` for the browser, bundler and npm; `api-steward` for API shape, semver and the thesis.

## What this command is NOT

- **Not a release button.** `semantic-release` owns the version and computes it from commit messages. This command writes the message and shows you what it will produce; it never chooses a version number.
- **Not a plan reviewer.** `/cadence:planner` does that and this command calls it. Do not build a second reviewer inside this one.
- **Not accuracy evidence.** `npm test` is a precondition, never a verdict — the suite runs against synthetic seeded fixtures. What a real browser and real typing do is `/cadence:evidence`.
- **Not a benchmark.** The Aalto validation lives in `validation/`, which is gitignored and absent from every clone. Nothing here can re-validate a retuned constant, and nothing here should pretend to.
- **Not a refactor tool.** A large refactor needs its own plan and its own planner run, not a widened diff on a feature branch.
- **Not a worklog writer.** `/worklog` owns that. Step 10 only satisfies the `Stop` hook so the turn can end.
