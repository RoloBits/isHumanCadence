# TypeNet: Deep Learning Keystroke Biometrics

- **Citation:** Alejandro Acien, Aythami Morales, John V. Monaco, Ruben Vera-Rodriguez,
  Julian Fierrez. "TypeNet: Deep Learning Keystroke Biometrics." IEEE Transactions on
  Biometrics, Behavior, and Identity Science, 2021.
- **Link/DOI:** <https://arxiv.org/abs/2101.05570> (arXiv, v3 September 2021)
- **Open access:** yes — arXiv, CC BY-NC-ND 4.0. Link only here; no PDF committed (the ND
  and NC terms make redistribution in a public repo a question not worth opening).
- **Read-status:** skimmed — arXiv abstract page fetched 2026-08-02; full text not read
  yet.

## Key claims

- An LSTM-based network authenticates typists from free-text keystroke timing: equal-error
  rate **2.2%** on physical keyboards and **9.2%** on touchscreens, with 5 gallery
  sequences and test sequences of length 50 (abstract).
- Trained and evaluated on the Aalto corpus — the same 136M keystrokes / 168,000 subjects
  behind this repo's calibration — plus 63M keystrokes from 60,000 mobile users (abstract).
- Error grows only moderately when scaled to 100,000 subjects (abstract).

## Relevance to this repo

Upper bound on what keystroke timing alone carries: a model trained on the exact dataset
this repo's weights were calibrated against can tell *individual typists apart* at 2.2%
EER from 50-keystroke sequences. Distinguishing human-vs-bot is an easier task than
user-vs-user, so this is evidence the raw signal is rich enough for the product's thesis —
and a reminder that this repo's six hand-built metrics use a small slice of it. Also the
obvious reference point if a learned scorer is ever considered (it would break the zero-
dependency and <3KB constraints; that trade is `api-steward`'s, not ours).
