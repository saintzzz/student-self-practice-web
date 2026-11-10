# External Review - Round 184 (codex)

Reviewer: codex (real external run). Scope: commit c51ec6b, HEAD=c51ec6b.

1. [major] `supabase/migrations/0077_public_fetch_auth_caps.sql:40` - Authenticated and guest requests still increment the same `fq_ip_*` buckets. After classroom traffic pushes the shared counter past 60 calls or 2,500 rows, guests behind that school IP are rate-limited despite the separate guest caps described in the comments. - Use identity-separated IP buckets, or otherwise keep authenticated charges from consuming the guest allowance.

2. [minor] `src/components/admin/BulkImportCard.tsx:69` - CSV headers with a UTF-8 BOM (common in spreadsheet exports) are not recognized as `username`; the header is previewed as an invalid student row. - Strip a leading BOM before parsing or normalize the first cell.

