# ADR Format

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create the `docs/adr/` directory lazily — only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made
and *why* — not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful
  when decisions are revisited
- **Considered Options** — only when the rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

## Numbering

Scan `docs/adr/` for the highest existing number and increment by one.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth
   did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for
   specific reasons

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody
will wonder why. If there was no real alternative, there's nothing to record beyond "we did the
obvious thing."

### What qualifies here

This is a small single-package library, so the usual ADR examples — monorepo shape, message bus,
auth provider — do not apply. What does:

- **A statistical choice with a stated reason.** The KS test at α = 0.10 instead of 0.05. The
  reason lives in a code comment at `anti-spoof.ts:64-69`, which is the wrong place for it: a
  comment is deleted by whoever "simplifies" the line above it.
- **A deliberate deviation from the obvious path.** Gating a no-signal metric out of the weighted
  mean rather than scoring it as bot-like. The obvious implementation scores zero corrections as
  suspicious; this one does not, on purpose.
- **A constraint not visible in the code.** Zero runtime dependencies. The `<3KB gzip` budget.
  Nothing in the repo enforces either, so nothing in the repo explains either.
- **Rejected alternatives when the rejection is non-obvious.** Anything a reasonable contributor
  would propose again in six months — recording a rat's nest of published weights without the
  benchmark that produced them is how that happens.
- **The explicit no-s.** Never capturing key identity. That one is the product's whole thesis and
  it is currently written down only in the README's marketing copy.
