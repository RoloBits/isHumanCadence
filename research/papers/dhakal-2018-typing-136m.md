# Observations on Typing from 136 Million Keystrokes

- **Citation:** Vivek Dhakal, Anna Maria Feit, Per Ola Kristensson, Antti Oulasvirta.
  "Observations on Typing from 136 Million Keystrokes." Proceedings of the 2018 CHI
  Conference on Human Factors in Computing Systems (CHI '18), Montreal, April 2018.
  Best paper honorable mention.
- **Link/DOI:** <https://userinterfaces.aalto.fi/136Mkeystrokes/> (project page, PDF and
  dataset), <https://dl.acm.org/doi/10.1145/3173574.3174220> (DOI 10.1145/3173574.3174220)
- **Open access:** yes — the PDF (2.8 MB) and the raw dataset are freely downloadable from
  the Aalto project page. Link only here; no PDF committed.
- **Read-status:** skimmed — project page and abstract fetched 2026-08-02; full text not
  read yet.

## Key claims

- 168,000 volunteers, 136 million keystrokes, collected through an online typing test
  (project page; abstract).
- "Overlapping keypresses (rollover) are surprisingly common and it can indicate faster
  typing" (project page, key findings list).
- Faster typists make fewer errors; slower typists especially replace letters with wrong
  ones (project page, key findings list).
- Letter pairs typed by different hands or fingers are more predictive of typing speed
  than letter repetitions (abstract).

## Relevance to this repo

This is **the dataset behind `DEFAULT_WEIGHTS`**. The comment at `src/analyzer.ts:6-18`
cites per-metric averages over 168,593 subjects and points at `validation/AALTO-ANALYSIS.md
§8`, which is gitignored and absent from any clone — so this link is the only public trail
back to the calibration source. The paper's rollover finding is the empirical grounding for
`rolloverRate` carrying the largest default weight (0.25), and its error-rate findings bear
on `correctionRatio`. Anyone re-deriving or re-tuning the weights starts from this page.
