# External Review - Round 142 (codex)

Reviewer: codex (real external run). Scope: base c0075d5, HEAD=546d85b.

1. [severity major] scripts/_exam-signoff-verify.mjs:123 - `--offset N` fetches row N, then `gt` pagination skips it, leaving a question unreviewed on every resume. Fix: fetch row N-1 as the exclusive cursor.

2. [severity major] scripts/_exam-signoff-verify.mjs:124 - An exhausted offset or HTTP error leaves `cursor=null`, restarting the entire scan and potentially overwriting signoff outputs with unintended results. Fix: check `r.ok`, abort on failure, and return zero candidates when the offset lookup is empty.

## Disposition (same session)

Both findings were fixed by the reviewer in the same run before commit
546d85b landed: the resume fetch now reads `offset=OFFSET-1` as the
exclusive cursor, `!r.ok` throws, and an exhausted offset exits early
instead of restarting the scan. Verified against the committed source.
No actionable findings remain - ROUND CLEAN.

