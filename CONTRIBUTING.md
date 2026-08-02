# Contributing

For humans and agents. Agents: read [AGENTS.md](AGENTS.md) first — it holds the setup
commands, the tooling, the evidence bar, and the known-flaws list. This file does not repeat
it.

## Pull requests only

`main` merges to npm: `.github/workflows/release.yml` runs semantic-release on every push to
`main` and publishes to the public registry. Because a bad publish cannot be unpublished
after 72 hours, `main` only moves through a pull request — ruleset `protect-main` requires
one with the `Test` check passing, no bypass for anyone. The maintainer merges.

**A PR claiming an accuracy or detection improvement without evidence — both human false
positives on the CMU corpus and bot false negatives, with the literal command and output —
will not be merged.** The bar is in AGENTS.md under "The evidence bar".

## Commits

Conventional Commits, because semantic-release reads the type to decide the release:

| Type | Publishes |
|---|---|
| `feat:` | minor |
| `fix:`, `perf:` | patch |
| `BREAKING CHANGE:` footer | major |
| `chore:`, `docs:`, `test:`, `ci:`, everything else | nothing |

A change confined to `examples/`, `docs/`, `tests/`, `.github/` or `.claude/` never uses
`feat:` or `fix:`. Do not hand-edit `package.json`'s `version` (stale on purpose) or
`CHANGELOG.md` — semantic-release computes the version from tags.

## Local gates

- `npm run check` — typecheck, lint, test, build. Run it before pushing.
- lefthook (installed by `npm ci` via `prepare`) refuses commits on `main`, runs
  `lint-staged` on staged `*.{ts,tsx}`, validates the commit subject against Conventional
  Commits, and refuses `feat`/`fix`/`perf` when nothing under `src/` is staged.

CI (`.github/workflows/ci.yml`) runs the same four steps on every push and PR. Every PR
also gets an ephemeral demo deploy comparing main's engine against the branch's — the URL
is commented on the PR.

## The demo

```sh
cd examples/react && npm install && npm run dev
```

## Research

Accuracy work lives in `research/` — hypothesis before run, results with literal output.
Format and runner in AGENTS.md; index in `research/INDEX.md`.

## Licence

MIT. See [LICENSE](LICENSE).
