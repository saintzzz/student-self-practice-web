# External Review - Round 131 (codex)

Reviewer: codex (real external run). Scope: commit 8c4cd16, HEAD=8c4cd16.

1. [severity major] scripts/polish-explanations.mjs:99 - Apply ignores recorded `before`, so an old artifact silently overwrites subsequent teacher corrections. HTTP 204 also counts nonexistent IDs as applied. - Use an atomic conditional update against `before`, request returned IDs, and fail on conflicts or missing rows; accept already-proposed values as idempotent success.

2. [severity minor] scripts/polish-explanations.mjs:35 - Quote parsing treats apostrophes inside contractions as delimiters. For `'can't' nghia la 'khong the'`, it captures `can` and Vietnamese prose instead of `can't`; restoring Vietnamese diacritics then fails term preservation. - Match paired quotation delimiters while allowing internal apostrophes, and restrict preservation checks to English terms.

