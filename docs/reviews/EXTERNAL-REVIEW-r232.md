# External Review - Round 232 (codex)

Reviewer: codex (real external run). Scope: commit 9b88eb4, HEAD=9b88eb4.

1. [severity major] src/lib/engagement/sync.ts:249 - Concurrent merges permanently erase earned progress. Reproduced with two epoch-0 devices holding 11 distinct lights each: merging in opposite orders yields different retirement sets; syncing those results removes all remaining lights, dropping progress from 22 completions to 12. Fix: derive lap count and remainder from a convergent unique-event representation; add opposite-order merge followed by remerge regression coverage.

