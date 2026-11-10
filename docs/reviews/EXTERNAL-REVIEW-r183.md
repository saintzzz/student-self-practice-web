# External Review - Round 183 (codex)

Reviewer: codex (real external run). Scope: commit 36f6c22, HEAD=36f6c22.

1. [major] `src/components/admin/BulkImportCard.tsx:44` - The UI advertises `.csv` and downloads a CSV template, but `read-excel-file/browser` reads `.xlsx` files; uploading that template fails. - Parse CSV files with a CSV parser or remove CSV from the UI and template. ([package documentation](https://www.npmjs.com/package/read-excel-file?activeTab=readme%2F1000))

2. [major] `supabase/migrations/0076_school_ip_caps.sql:22` - The migration raises caps on `fetch_questions` and `fetch_questions_adaptive` but leaves `fetch_questions_public` at 60 calls/2,500 rows per IP. That RPC also allows authenticated callers, so they can still hit household limits. - Raise the authenticated-call caps there while retaining strict guest caps.

3. [minor] `src/components/admin/BulkImportCard.tsx:117` - The file input and class selector have no accessible labels, leaving their purpose unclear to screen-reader users. - Add associated `<label>` elements or explicit accessible names.

