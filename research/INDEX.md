# research/ index

One line per entry, newest last. Format:

```
<date>  <kind>   <path or link> — one-line summary
```

Kinds: `paper` (verified entry in papers/), `experiment` (directory in experiments/, with
its verdict), `lead` (a reference found but NOT verified this side of a fetch — no papers/
entry exists for it, and nothing may be cited from it until it is promoted).

## Entries

- 2026-08-02  paper       papers/dhakal-2018-typing-136m.md — the Aalto 136M/168K corpus behind DEFAULT_WEIGHTS; rollover is common and tied to speed
- 2026-08-02  paper       papers/killourhy-maxion-2009-ks-benchmark.md — CMU fixed-text benchmark, 51 subjects, best detector 9.62% EER, data freely rerunnable
- 2026-08-02  paper       papers/acien-2021-typenet.md — LSTM on the same Aalto corpus reaches 2.2% EER user-vs-user; upper bound on the timing signal
- 2026-08-02  paper       papers/shadman-2025-kd-survey.md — ACM Computing Surveys map of the field, 2025; dataset and method finder
- 2026-08-02  lead        Chu, Gianvecchio, Wang, Jajodia, "Blog or Block: Detecting Blog Bots Through Behavioral Biometrics", Computer Networks 2013, DOI 10.1016/j.comnet.2012.10.005, <https://www.eecis.udel.edu/~hnw/paper/comnet13.pdf> — UNVERIFIED: PDF fetched but not readable in this session; only the DOI was confirmed from its metadata. Promote after an actual read.
- 2026-08-02  experiment  experiments/2026-08-02-bot-fixtures-vs-human-threshold/ — verdict: refuted — gaussianBot median 0.7186 and replayBot median 0.7671 score above the 0.70 human threshold on in-repo fixtures
