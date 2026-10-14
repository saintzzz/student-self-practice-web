# External Review - Round 25 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit HEAD, HEAD=728fe2f.

1. [severity minor] src/lib/rounds/pronunciationScoring.ts:90 - Stripping punctuation before digit mapping turns `"1.0"` into `"ten"` and `"1.5"` into `"fifteen"`, creating false exact matches for different spoken numbers. - Recognize integer tokens before removing punctuation; preserve decimal separators and signs. Add regression tests alongside `"1." → "one"`.

Review limited to supplied diff; repository access was blocked by execution policy.


## Triage

1. CONFIRMED + FIXED - digit mapping now requires a pure digit token with
   only trailing punctuation; interior punctuation (decimals, times) no
   longer fuses into a number word after stripping. Unmappable digit
   tokens drop out instead of surviving as digit strings. Regression
   tests cover "1.0"->not-"ten", "1.5"->not-"fifteen".

Gates: tsc clean, 43/43 scorer tests.
