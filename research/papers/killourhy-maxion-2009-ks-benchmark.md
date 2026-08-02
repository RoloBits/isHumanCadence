# Comparing Anomaly-Detection Algorithms for Keystroke Dynamics

- **Citation:** Kevin S. Killourhy, Roy A. Maxion. "Comparing Anomaly-Detection Algorithms
  for Keystroke Dynamics." IEEE/IFIP International Conference on Dependable Systems &
  Networks (DSN 2009), Lisbon, June 29 - July 2, 2009, pp. 125-134.
- **Link/DOI:** <https://www.cs.cmu.edu/~keystroke/> (benchmark page, data, R evaluation
  script), <https://www.cs.cmu.edu/~maxion/pubs/KillourhyMaxion09.pdf> (author PDF)
- **Open access:** yes — the paper PDF, the dataset (fixed-width, CSV, Excel) and the R
  evaluation script are all freely available from CMU. Link only here; no PDF committed.
- **Read-status:** skimmed — CMU benchmark page fetched 2026-08-02; full text not read yet.

## Key claims

- Benchmark: 51 subjects each typed the password `.tie5Roanl` 400 times across 8 sessions,
  yielding 31 timing features per repetition — hold times, keydown-keydown and
  keyup-keydown intervals (CMU benchmark page).
- 14 anomaly detectors were evaluated under one repeatable procedure (CMU benchmark page).
- Best detector: scaled Manhattan distance, average equal-error rate **9.62%**
  (sd 0.0694) (CMU benchmark page, results table).

## Relevance to this repo

The standard yardstick for fixed-text keystroke dynamics, with data anyone can rerun. Two
cautions when citing it here. First, the task differs: this benchmark is user-vs-user
authentication, not human-vs-bot detection — the numbers do not transfer directly. Second,
the ceiling it implies is sobering: supervised detectors with 200 training repetitions per
subject still sit near 10% EER on hold/flight features. Six unsupervised heuristic metrics
over an 80-keystroke window should not claim accuracy that literature could not reach with
far more data. Its dataset is also a candidate real-typing corpus for climbing the evidence
ladder past the in-repo fixtures.
