---
name: releasing
description: The release contract for this repo — semantic-release publishes to the public npm registry on every push to main, and the commit message is the only thing that decides which version. Read this before writing any commit message, before deciding a bump level, and any time you are about to say "this change is small enough to just push". Covers the type-to-bump map, what must never use feat or fix, the breaking-change footer that has never been used here, and what the release workflow does with each.
---

# Releasing

**semantic-release owns the version. Not you, not a tag you cut by hand, not `package.json`.**

And it owns more than the version: pushing to `main` publishes to the public npm registry, to
everyone who installs `@rolobits/is-human-cadence`. There is no branch protection on `main`
(verified 2026-08-02: `gh api repos/RoloBits/isHumanCadence/branches/main/protection` returns
`{"message":"Branch not protected"}`) and no ruleset. Nothing stands between a commit message and
a published version except the message itself.

## The rule

**Every commit that lands on `main` states its release intent in its type, and the type is a
decision, not a formatting convention.**

`.releaserc.json` runs `@semantic-release/commit-analyzer` on the default Angular preset. It reads
every commit since the last tag, takes the highest bump any of them implies, and publishes.

| Type in the commit subject | What semantic-release does |
|---|---|
| `feat:` | **minor** — publishes |
| `fix:` | **patch** — publishes |
| `perf:` | **patch** — publishes |
| a `BREAKING CHANGE:` footer, on any type | **major** — publishes |
| `docs:` `chore:` `test:` `ci:` `style:` `refactor:` `build:` | nothing. No version, no publish. |

The last row is not a loophole and not a lesser choice. It is the explicit way to say *this ships
nothing to a user*, and it is the correct type for most of what lands here.

## The failure this removes

An absent release decision is ambiguous. A commit typed by habit rather than by intent reads
identically whether the author decided the change ships nothing or simply reached for the type
that felt right, and you cannot tell which from the diff.

It has already gone wrong twice, and both are in this repo's history. Verified 2026-08-02 against
`git log` and `CHANGELOG.md`:

| Commit | Subject | What it actually changed | What shipped |
|---|---|---|---|
| `296a580` | `feat: rebuild demo as React app with multi-field form support` | the demo **and** `src/analyzer.ts`, `src/index.ts`, `src/observer.ts`, `src/react/index.ts`, `src/types.ts` | **1.1.0** |
| `f9fab4b` | `fix(demo): add metric sparkline cards with full history` | the demo **and** the same five `src/` files | **1.4.1** |

`f9fab4b` is the sharp one. Under a subject that says *demo* and a scope that says *demo*, it added
`recordEvents?: boolean` to `CadenceConfig`, added the exported type `KeystrokeEvent`, and added an
`events?: KeystrokeEvent[]` field to the result. That is a new public option and a new public type
— a `feat:` by any reading — and it published as **1.4.1, a patch**.

So `CHANGELOG.md:20` tells a consumer that 1.4.1 "add[s] metric sparkline cards with full history".
It says nothing about the API that arrived with it. Anyone scanning the changelog for a reason to
upgrade had no way to learn there was a new option, and anyone auditing the patch for risk saw a
demo change. Nothing errored. Nobody was told.

**The lesson is not "don't type a demo change as a fix".** It is that **the type and the scope
describe the library change, or they describe nothing.** When a commit touches both the demo and
`src/`, the demo is not what the message is about. And a new export is never a patch — take it to
`public-api/SKILL.md`.

The failure runs both directions: the wrong type publishes a version whose changelog entry
describes something else, and the missing type ships behaviour at a version that never moved.

## The map from what changed to what type

The version describes **the published package's observable behaviour** — what a consumer running
`npm install @rolobits/is-human-cadence` could tell the difference about. `files: ["dist"]`, so
the published artifact is `dist/` and nothing else.

| What changed | Type |
|---|---|
| `src/` — new capability, new option, new export | `feat:` |
| `src/` — wrong behaviour corrected | `fix:` |
| `src/` — an export removed, renamed, or its type narrowed | `feat:` **plus** a `BREAKING CHANGE:` footer |
| `src/` — a default constant retuned so scores move | see *The interesting case* below |
| `src/` — a rename or reshuffle a consumer cannot observe | `refactor:` |
| `tests/` alone | `test:` |
| `examples/` — the demo, in any way, for any reason | `chore(demo):` or `docs(demo):` |
| `.github/`, `lefthook.yml`, `.lintstagedrc.json` | `ci:` or `chore:` |
| `.claude/` | `chore(claude):` |
| `README.md`, `CONTRIBUTING`, comments | `docs:` |
| `package.json` devDependencies, lockfile | `chore(deps):` |

**A `src/` change is not automatically a bump.** Renaming a local variable in `analyzer.ts` ships
nothing. Ask what a consumer would observe, not which directory moved.

**An `examples/` change is never a bump.** This is the rule the two incidents above violated. The
demo is `private: true`, has its own `package-lock.json`, is not in `files`, and is aliased to
`../../src` by `examples/react/vite.config.ts` — it is never part of the published artifact.

### The interesting case: retuning a constant

Changing `DEFAULT_WEIGHTS` (`analyzer.ts:20`), `KS_CRITICAL_COEFF` (`anti-spoof.ts`), or a
sigmoid parameter changes every score the library returns while changing no type and breaking no
build. TypeScript will not notice. The test suite may not notice, because it asserts thresholds,
not distributions.

This repo has shipped those as both `fix:` and `feat:` (1.4.0 carried
`fix(analyzer): recalibrate metric weights` and `feat(analyzer): gate no-signal metrics` in one
release). Neither is obviously wrong, and that is the point — it is a judgement, so make it out
loud:

- The scores move but the classification boundaries a caller would act on hold → `fix:`.
- A caller who tuned their own threshold against the old distribution would now behave
  differently → that is a behaviour change they cannot see coming. `feat:` at minimum, and say so
  in the body. Consider the `BREAKING CHANGE:` footer and take it to `api-steward` if unsure.
- Either way, the body names the measurement that justified it. `/cadence:evidence` exists for
  this, and "the tests still pass" is not the measurement — the suite runs against synthetic
  seeded fixtures in `tests/fixtures/`, generated by this repo to match its own model of a human.

## What the release workflow does

`.github/workflows/release.yml` runs on every push to `main`. It runs `npm ci`, `npm run lint`,
`npm test`, `npm run build`, then `npx semantic-release` with `GITHUB_TOKEN` and `NPM_TOKEN`.

Three outcomes:

- **At least one `feat:`/`fix:`/`perf:`/breaking commit since the last tag** → commit-analyzer
  picks the highest bump, `@semantic-release/npm` publishes to the registry, and
  `@semantic-release/github` cuts a GitHub Release carrying the generated notes and pushes the
  `vX.Y.Z` tag.

  **Nothing is committed back to `main`.** `@semantic-release/changelog` and
  `@semantic-release/git` were removed on 2026-08-02, when `main` gained a ruleset requiring a
  pull request. The commit-back would have been rejected — and it ran *after* the npm publish, so
  the failure would have landed with the package already public and the repo left behind. Two
  consequences to hold on to:

  - **`package.json`'s `version` in the repo is stale on purpose.** It says 1.5.1 and will keep
    saying it. The real version is the newest `v*` tag, the GitHub Release, and
    `npm view @rolobits/is-human-cadence version`. Do not "fix" it by hand — semantic-release
    computes the next version from the tags, not from that field.
  - **`CHANGELOG.md` stops at 1.5.1.** History before that is real; nothing new is appended. The
    changelog for anything newer is the GitHub Release notes.

  A branch ruleset targets `refs/heads/*` only, so pushing the `vX.Y.Z` tag is unaffected.
- **Only non-releasing types** → semantic-release runs, finds nothing to release, exits clean.
  Nothing publishes. This is the normal and expected outcome for most pushes.
- **The workflow fails after the push** → the commit is on `main` and the version did not
  publish. That is a third state, distinct from both success and failure, and it needs saying
  out loud when it happens rather than being reported as "the push worked".

## Traps

- **`release.yml` does not run `typecheck`.** `ci.yml` runs it; the release job runs only lint,
  test and build. A type error that `tsc --noEmit` would catch can still reach a publish, because
  `tsup` emits declarations without full project type-checking. Run `npm run check` before
  landing, not just `npm test`.
- **CI blocks nothing.** No branch protection, no required checks. A red `ci.yml` and a successful
  publish can happen on the same commit.
- **Never edit `version` in `package.json` by hand.** That field is `@semantic-release/npm`'s
  output. Hand-editing it desynchronises the tag history from the registry.
- **The scope does not change the bump.** `fix(demo):` is a patch exactly like `fix:` is. The
  parenthesised scope is documentation for humans; commit-analyzer reads the type before it.
- **`BREAKING CHANGE:` is a footer, not a subject prefix.** It goes in the commit body after a
  blank line. `feat!:` also works in the Angular preset, but this repo has never used either —
  there is no precedent to copy, so write the footer form and spell out the migration.
- **Nothing enforces the convention at commit time.** `lefthook.yml` has a `pre-commit` hook only;
  there is no `commit-msg` hook. A malformed type is not rejected, it is silently treated as
  non-releasing — which is safe, and is why a *typo* is less dangerous here than a *deliberate
  wrong type*.
- **Unpublishing is not a recovery plan.** npm allows unpublish within 72 hours and it breaks
  every lockfile that already pinned the version. The recovery for a bad publish is another
  publish. Treat the push as final.

## Where this is enforced

- Nowhere mechanically. That is the honest answer, and it is why this file exists.
- `/cadence:build` reads this skill at its commit step, states the resulting version at the
  release gate by running `npx semantic-release --dry-run`, and will not land without an explicit
  yes.
- `/cadence:refresh-agents` commits its own work as `chore(claude):` for exactly this reason.

If you find yourself about to write "this is too small to need a proper type", that is the
`chore:` case, not an exemption.
