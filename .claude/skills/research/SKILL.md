---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it reads.

Its job:

1. Investigate the question against **primary sources** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.

In this repo, route before spawning a generic agent — two owners already exist:

- **Papers, algorithms, experiments, anything about keystroke-dynamics literature or measuring
  this library against alternatives** → the `researcher` agent. Its record lives in `research/`
  (papers with verified links, experiments with hypothesis and results), which is exactly the
  "where the repo keeps such notes" this skill asks for.
- **Browser, spec and bundler facts** → `browser-expert` first; what it calls *"neither documented
  nor measured"* becomes an experiment for `researcher` to run.

Everything else follows the generic recipe above, saved to `.claude/worklog/` in the format of
`.claude/commands/worklog.md`.

---

*Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock).*
