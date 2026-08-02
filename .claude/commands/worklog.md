---
description: Save the current conversation topic to the worklog, or recall a past one (by topic or date)
---

Their input is: $ARGUMENTS

The worklog lives at `.claude/worklog/` — one markdown file per topic, with YAML frontmatter
(`topic`, `started`, `last`, `status`) and dated `## YYYY-MM-DD` sections. `INDEX.md` has one line
per file.

It exists because this repo has no other place for reasoning. `CHANGELOG.md` records what shipped;
it never records what was measured, what was rejected, or why a constant is the number it is. The
Aalto benchmark that calibrated `DEFAULT_WEIGHTS` lives in a gitignored `validation/` directory
that is not in the repo, so the numbers behind the published weights exist nowhere a future
session can read them. Every measurement that does not land here is lost.

## Save — empty arguments, or "save"

1. Identify the topic. Ask only if genuinely ambiguous.
2. If a file for it exists per `INDEX.md`, append a new `## <today>` section. Otherwise create
   `<YYYY-MM-DD>-<slug>.md` with the frontmatter.
3. Write a summary a future session can **act on**: what was asked, what was found or decided
   (root causes, file paths, commands, commit refs, real numbers), what is still open. **Not a
   play-by-play.**
4. Update `last:` and `status:` in the frontmatter, and the file's line in `INDEX.md`.
5. Clean up the hook flag: `git rev-parse HEAD > .claude/worklog/.last-head`

### What an entry carries

- **Decisions with their reasoning preserved**, including the alternatives rejected and why. A
  decision without its reason gets re-litigated in three months.
- **Measured numbers with the measurement**, never an assertion. `173 tests pass in 1.42s,
  vitest 2.1.9` beats "the suite is green". A score is reported with its n, its median and its
  spread, and the fixture or corpus that produced it.
- **Exact references**: commit SHAs, `file.ts:line` cites, the literal command that was run.
- **Self-corrections kept in place**, struck through rather than deleted. A retracted claim is
  more useful than a silently vanished one, because the next session will otherwise reach the
  same wrong conclusion.
- **Stated ceilings** — what the check does *not* cover. "Passes against synthetic fixtures; not
  run against real keystrokes" is the single most valuable sentence in an accuracy entry.
- **An `### Open` section last** — blockers, unanswered questions, and things deliberately left
  alone so they are not re-argued.

Excluded: turn-by-turn narration, tool transcripts, code diffs (reference the SHA instead), and
anything that would need re-reading to act on.

## Recall — a topic, a date, or a range

1. Search `INDEX.md` first, then grep the file contents. Match topic words or dates against the
   frontmatter and the `##` sections.
2. If nothing matches, fall back to grepping the raw session transcripts in
   `~/.claude/projects/-Users-franciscolopez-Desktop-RoloBits-isHumanCadence/*.jsonl`. They purge
   after about 30 days.
3. Summarise what was found and offer to continue from there.

## The hook

`.claude/settings.local.json` registers two hooks. `UserPromptSubmit` notices when HEAD moved to a
commit the developer authored outside this session and says so — advisory, it cannot block. `Stop`
returns `decision: block` when HEAD moved to a developer-authored commit this turn and the
worklog has not caught up. That is enforcement, not a bug: do not route around it, and never mark
it `async` — the response is discarded and it silently stops working.

Work that is genuinely not worklog-worthy — a typo, a fixup, a dependency bump — clears the block
with the cleanup command alone. That is a legitimate answer, not a bypass.
