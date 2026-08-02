---
description: >-
  Bring every agent that declares `watched_paths` back in line with what `src/` actually does.
  Derives its own scope from `.claude/agents/*.md`, diffs each agent from its `last_verified_sha`
  to HEAD, reads the real diff and the real source, then REWRITES the agent body — new behaviour
  gets described, removed behaviour gets cut, renamed paths get fixed, wrong claims get corrected,
  and every `file.ts:line` cite into a modified file gets re-derived. Verifies with `npm run check`,
  branches, commits as `chore(claude):`. No push, no PR.
  Do NOT invoke for: updating `browser-expert` (its substrate is browser and npm behaviour, not
  this repo's diff) or `api-steward` (it holds decisions, and no source file supplies their *why*);
  reviewing a plan (`/cadence:planner`); implementing one (`/cadence:build`); or deciding a release
  (`releasing` skill).
  Common triggers: "the agents are stale", "refresh the agents", "cadence-core is citing old line
  numbers", "I changed src/ and the agent still describes the old behaviour".
  <example>
  user: "/cadence:refresh-agents"
  assistant: preflights, derives scope to `cadence-core`, diffs `src/**` and `tests/**` from its
  baseline, finds `analyzer.ts` modified, re-derives all 40-odd cites into it by reading the file,
  rewrites the two paragraphs whose claims the diff falsified, and commits on a branch.
  <commentary>Rewriting the body is the job. A run that only checked cites and bumped the SHA
  would have done nothing, and would have laundered an unverified file as verified.</commentary>
  </example>
  <example>
  user: "just bump the SHAs, the code barely changed"
  assistant: refuses the shortcut and explains why — a bumped `last_verified_sha` over a body
  nobody re-read is worse than a stale one, because the stale one is at least honest about when it
  was last checked.
  <commentary>The metadata is a claim about verification. Writing it without doing the work makes
  the claim false, and nothing in this repo would ever catch it.</commentary>
  </example>
argument-hint: '(no arguments)'
# Rewrites agent files, creates a branch and commits. Only a human starts this.
disable-model-invocation: true
---

You are running `/cadence:refresh-agents`.

`$ARGUMENTS` is ignored — there are no flags in this version. If the developer passed something, say it is ignored and continue. To refresh against a baseline other than the one in the file, edit `last_verified_sha` first and re-run.

## What this command is for

An agent file makes claims about code. The code moves; the file does not. The failure is not that the agent becomes vague — it is that the agent states, **with a citation**, something that is no longer true, and a citation makes a wrong claim more convincing, not less. `cadence-core` carries roughly a hundred `file.ts:line` claims about a `src/` of eight files that has been rewritten repeatedly (`110600d`, `0f5ea10`, `d482f37`, `06206b3`, `e4da12e` all changed the analyzer or the observer). This command is the thing that keeps those claims true.

**Rewriting the body IS the job.** Checking that citations still point somewhere is the cheap part and it is not what this command is for. A run that only verifies cites and bumps the metadata has done nothing. If `src/` gained a behaviour, the body must gain a paragraph describing it. If `src/` lost one, the body must lose it.

## Architecture

Runs **entirely in the main session**. There is no meta-agent to spawn and you must not invent one.

**Never consult `cadence-core` during its own refresh.** It is the file being rewritten; asking it what the code does and then writing the answer back into it is circular — it would confirm its own stale claims, and the confirmation would read exactly like verification. Ground every change in `src/` and `tests/` read directly, and in the diff. **This is the one rule most likely to feel harmless to break**, because consulting it is fast, its answers are fluent, and nothing distinguishes a correct answer from a stale one at the point where you would be writing it down.

## In scope — DERIVE the list, never hardcode it

Every `.claude/agents/*.md` whose `x-cadence-meta` block declares `watched_paths`:

```bash
for f in .claude/agents/*.md; do
  grep -q 'watched_paths:' "$f" && echo "$f"
done
```

Today that yields exactly one: `cadence-core`. **Trust the command, not this sentence** — a new sibling must be picked up automatically, and hardcoding a list is how an agent gets silently skipped for months.

**`browser-expert` and `api-steward` are excluded, and not by accident.** Neither declares `watched_paths`, because neither is about this repo's source.

- `browser-expert` pins **doc sources** — a spec page, a browser release note, a bundler changelog. A diff over `src/` cannot detect that Safari changed timer coarsening or that npm changed provenance defaults. Refreshing it means re-reading those sources and re-running the measurements, and its `[M]` column is empty today.
- `api-steward` holds **decisions**: what the package is for, what it will not do, why `KS_CRITICAL_COEFF` is 1.22 and not 1.36. Those change by deliberate act, and their *why* no source file can supply. Rewriting it from `src/` would destroy exactly what it exists to hold — it would replace the reasons with a description of the current code, which is the one thing the code can already tell you itself.

If either needs updating, that is a different job — do not do it here.

An in-scope file with `watched_paths` but **no `last_verified_sha`** has scope and no baseline. **Do not fall back to the agent file's own last commit**: that compares the agent to itself and reports zero drift no matter how far the source has moved. Bootstrap it instead — set `last_verified_sha` to HEAD, say plainly in the report that the body was **not** verified against anything, and stop. Nothing catches this state automatically, so check it rather than assuming.

---

## Step 0: Preflight — hard refusals

All of these before touching anything. Print the reason and stop.

1. **Not detached.** `git symbolic-ref -q HEAD` must succeed. An edit on a dangling commit can be garbage-collected.
2. **Clean tree.** `git status --porcelain` must be empty. `dist/`, `coverage/` and `validation/` are git-ignored so they never show here; anything that does is real work and is not yours to carry. Do not stash it for them.
3. **Not a shallow clone.** `.git/shallow` must not exist — `<baseline>..HEAD` is silently wrong on a truncated history.
4. **`npm run check` green.** That is `typecheck && lint && test && build`. Read the test count out of **that** run and carry it forward; never a number from this file. A red baseline means you cannot tell what your own rewrite broke.

## Step 1: Establish HEAD

**Two entry points, both legitimate — say in the report which one you are on.**

- **On a feature branch that changed `src/`.** The refresh rides along with the change, so `main` never has a window where the code moved and the agent did not. This is the preferred one, and it is the case that matters: the person who changed the code is the person who knows what it means.
- **On `main`, after something landed that nobody refreshed.** The catch-up path, and in this repo it is the common one. `git fetch origin main && git pull --ff-only` first; if `--ff-only` fails, `main` has diverged locally — stop, do not merge or reset.

### What this repo's history actually is — verified 2026-08-02 against `git log`

Keeps could rely on merge-not-squash, so a `last_verified_sha` taken on a feature branch survived into `main` and stayed valid as a future baseline. **That premise does not transfer, and you must not assume it here.** What `git log` says:

- 41 commits, **2 merge commits** — `3cc3d31` and `d4e0e92`, both `Merge pull request` from **Dependabot**. No human has ever opened a PR in this repo.
- The other 39 commits are **direct to `main`**, including semantic-release's own `chore(release): x.y.z [skip ci]` commits.
- So the normal baseline here is already a commit on `main`, and it survives because nothing rewrites `main`. The two Dependabot merges show merge commits are at least *permitted*; nothing shows what happens to a squashed feature branch, because there has never been one.

The practical rule that follows: **before trusting a baseline, confirm it is reachable from `main`.**

```bash
git cat-file -e "$BASE^{commit}" || echo "BASE does not exist — the branch it came from was rewritten"
git merge-base --is-ancestor "$BASE" main || echo "BASE is not on main — it is a feature-branch commit"
```

A `BASE` that is not an ancestor of `main` is not automatically wrong — on the feature-branch entry point it is expected — but it is a SHA that will vanish if that branch is ever squash-merged or dropped. Say so in the report rather than discovering it on the next run.

**There is no rebase step, deliberately.** `main` moves by direct commit here, so there is nothing to rebase onto that a `pull --ff-only` has not already given you.

Capture `HEAD=$(git rev-parse HEAD)` and the newest tag, `git tag --sort=-creatordate | head -1`.

## Step 2: Compute the drift

For each in-scope agent, read `last_verified_sha` as `BASE`, then diff over that agent's **own** `watched_paths`:

```bash
git diff --name-status -M "$BASE".."$HEAD" -- 'src/**' 'tests/**'
```

**Quote every pathspec.** `watched_paths` entries contain `**`, and zsh expands them before git ever sees them; an unquoted pathspec returns nothing and the agent reports zero drift while real changes sit there. Build a quoted array from the agent's own `watched_paths` rather than retyping them — retyping is how the list in this file and the list in the agent drift apart.

**Zero drift is a result you have to earn, not one you may assume.** Before reporting it, run:

```bash
git log --oneline "$BASE".."$HEAD"
```

and confirm no commit in that range touches a watched path. If a commit does and the diff says nothing changed, your pathspec is broken — fix the pathspec, do not report the all-clear.

Then read the substance, not just the file names:

```bash
git diff -U10 "$BASE".."$HEAD" -- <each changed file>
```

## Step 3: Rewrite the body — this is the command

Work each signal. Nothing here is optional because it looks quiet.

| Signal | What you do to the body |
| --- | --- |
| `A` added file | Read it. If it introduces behaviour the agent should know, **write the section**. Add a `## Scope` bullet. A new test file changes the suite inventory |
| `D` deleted file | Cut the prose that describes it. Do not leave a paragraph about code that is gone |
| `R` renamed file | Rewrite every path reference to the new path. Mechanical, always safe |
| `M` modified file | **Re-derive every `file.ts:line` cite into that file** — see below. Then read the diff and decide whether any claim about it is now wrong |
| Constant value changed | Update the quoted value everywhere it appears — `DEFAULT_WEIGHTS`, `KS_CRITICAL_COEFF`, `NO_DATA`, the Schmitt-trigger thresholds |
| Behaviour changed | Correct the claim. This is the one that matters most and the one no grep finds |

### A modified file invalidates its cites

`cadence-core` makes on the order of a hundred `file.ts:line` claims, and **any insertion or deletion shifts every cite below it.** One added import moves them all. This is the largest mechanical job in a refresh.

So for every `M` file: read the file **in full** (`src/analyzer.ts` is the longest at ~11 KB; none is unreadable in one pass) and re-derive each cite by finding what the agent actually claims and locating it at its current line. **Do not assume a cite is fine because it is still in range.** A cite that slid from 65 to 71 still lands inside the file and still points at the wrong code, and nothing in this repo will tell you — only reading the line will.

### Rules for what you may write

- **Never invent a fact.** Every added or corrected sentence must be backed by a line you have read this run. If you cannot ground it, it is a recommendation in the report, not an edit.
- **Never delete a claim just because it looks redundant.** Some repetition is a grounding anchor. Cut prose only when the diff proves the behaviour is gone.
- **Do not "modernise" prose** that is merely old-fashioned. The diff is for a human to review; a rewrite that reads worse gets rejected and wastes the run.
- **Never edit between `<!-- cadence:human-authored:start -->` and `<!-- cadence:human-authored:end -->`.** Surface those as manual recommendations. If `human_authored_blocks` in the metadata disagrees with the count in the body, say so loudly — someone moved a marker.
- **Preserve the agent's voice.** These files argue with the reader and cite tests by name. Match that; do not emit a changelog.
- **Keep the ignorance phrase.** Where the code does not settle a question, `cadence-core` says *"not settled in the code"*. Do not replace it with a guess that reads better.

### Then update the metadata

```yaml
last_verified_sha: <HEAD, full 40 chars>
last_verified_at: <date -u +%Y-%m-%dT%H:%M:%SZ>
last_verified_tag: <newest tag, or leave the prior value>
```

Bump it **only** if you actually re-verified the body against that range. A bumped SHA over an unread body is worse than a stale one: it launders an unverified file as verified, and the next run will trust it.

## Step 4: Verify before you commit

1. **`npm run check`** — must be green, and the test count must be ≥ the Step 0 count. **This proves the library still works and says nothing whatever about your rewrite.** Nothing mechanical checks the agent files: they are markdown, `eslint` runs on `src/` and `tests/` only, and there is no cite checker anywhere in this repo. Do not add one — a stale line number in a markdown file should not turn the suite red.
2. **Read every cite you wrote or moved, at its line, in the file. Not a sample — every one.** This is the only thing standing between a rewrite and a confidently wrong citation, so it is not the step to hurry. If you re-derived cites into a modified file, that means all of them.
3. `git diff -- .claude/agents/` and read it as a reviewer would.

## Step 5: Branch and commit

**Zero drift → do not create an empty commit.** Print `Zero scope drift — <n> agent(s) already current against <short-sha>. Nothing to commit.` and go to Step 6.

Otherwise:

```bash
git switch -c chore/refresh-agents-<YYYY-MM-DD>
git add .claude/agents/<each changed file>
```

On a feature branch, commit where you are: the refresh belongs to the change that caused it. Coming from `main`, branch first. **Nothing in this repo refuses a commit on `main`** — `lefthook.yml` has one hook, `pre-commit`, which runs `npx lint-staged` under `glob: "*.{ts,tsx}"`, and `.lintstagedrc.json` maps that to `eslint --max-warnings 0 --no-warn-ignored`. There is no branch-name check, no commit-message hook, and no commit-on-`main` refusal. **Do not claim one exists.** Note the consequence for this run in particular: a commit that stages only `.claude/**.md` matches that glob nowhere, so **the pre-commit hook runs nothing at all** on this change. The branch is a discipline you impose, not one the repo enforces — and the reason to impose it is that a commit sitting on local `main` is one `git push` away from a release run.

### The commit type

```
chore(claude): refresh <n> agent(s) against <short-sha>
```

**`chore(claude):` because it publishes nothing.** `.releaserc.json` runs `@semantic-release/commit-analyzer` on every push to `main`, and the commit message alone decides the version: `feat:` → minor, `fix:` → patch, a `BREAKING CHANGE:` footer → major, anything else → nothing ships. This is not a theoretical hazard in this repo — it has already happened twice:

The repo has already shipped a release whose message described something other than what it changed: `f9fab4b`, subject `fix(demo): add metric sparkline cards with full history`, also changed five files under `src/`, adding the `recordEvents` option and the exported `KeystrokeEvent` type, and published as **1.4.1 — a patch**. Nothing errored and nobody was told.

A `feat:` or `fix:` on a commit that changes only agent prose is the same defect pointing the other way: it would publish a version of `@rolobits/is-human-cadence` whose contents are identical to the last one. `chore(claude):` is the accurate description, and accuracy is the whole rule. The full contract is `.claude/skills/releasing/SKILL.md`.

Body: one line per agent naming what actually changed in the body. **No `Co-Authored-By` trailer, no `Claude-Session:` line, no "Generated with" footer, no emoji** — the developer owns these words.

Never `--no-verify`, never `--force`. **Do not push and do not open a PR.** The repo is public and that call is the developer's — and here it is sharper than it was in Keeps: `.github/workflows/release.yml` runs on **every push to `main`** and ends in `npx semantic-release` against the real `NPM_TOKEN`. A push is the publish.

## Step 6: Report

```
### /cadence:refresh-agents

**Entry point:** <feature branch <name> | catch-up on main>
**Baseline → HEAD:** <short> → <short> (<n> commits in scope)
**Baseline reachable from main:** <yes | no — feature-branch commit, will vanish if squashed>
**Agents in scope:** <derived list>  |  **Excluded:** <name — reason>

Per agent:
  <name> — <changed | already current>
    scope drift: <A/M/D/R counts>
    body: <what you actually rewrote, in one line each, or "no body change">
    cites re-derived: <n>
    recommendations you did NOT apply: <each, with why, or "none">

**Checks:** npm run check — typecheck ok, lint ok, <n> tests pass / 0 fail, build ok
**Commit:** <sha> on <branch>, not pushed  |  or "no commit — zero drift"
```

Then stop.

## Guard rails

- **A run that rewrites nothing has done nothing.** Bumping metadata and checking cites is not a refresh. If the diff shows changed behaviour and the body came out identical, you skipped the job — say so rather than reporting success.
- **Never consult `cadence-core` while refreshing `cadence-core`.** Circular. Ground in source.
- **Never refresh an agent with no `watched_paths`.** `browser-expert` and `api-steward` have different substrates and are not this command's business.
- **Never bump `last_verified_sha` over a body you did not re-verify.**
- **Never invent a fact, a constant, or a line number.** Source-backed or it is a recommendation.
- **Never edit a human-authored block.**
- **Quote every pathspec** or the diff lies and says nothing changed.
- **Zero drift is earned.** Confirm with `git log --oneline BASE..HEAD` that no commit in range touched a watched path.
- **Read every cite you wrote or moved, at its line.** Every one, not a sample.
- **Commit as `chore(claude):`.** `feat:` or `fix:` on agent prose publishes an empty version to npm — 1.1.0 and 1.4.1 already did exactly that.
- **Never `--no-verify`, never push, never open a PR.** A push to `main` publishes.

## What this command is NOT

- **Not a linter.** There is no mechanical check on the agent files at all, and there should not be — a stale line number in markdown turning `npm run check` red would block unrelated library commits. This command changes what the agent *says*, and reading is what verifies it.
- **Not a release.** It stops at a local commit on a fresh branch. What ships, and when, belongs to the `releasing` skill and to the developer.
- **Not a bootstrapper.** An agent with no baseline is reported and skipped, not silently compared to itself.
- **Not for the other two agents.** `browser-expert` is refreshed by re-reading its doc sources and re-running its measurements; `api-steward` changes only when a decision changes. Both are real jobs and neither is this one.
- **Not a plan review.** `/cadence:planner` reviews plans; this one reviews nothing and rewrites files.
