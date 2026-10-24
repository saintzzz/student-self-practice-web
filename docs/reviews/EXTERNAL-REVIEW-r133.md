# External Review - Round 133 (codex)

Reviewer: codex (real external run). Scope: commit 8c640c3, HEAD=8c640c3.

1. [severity major] scripts/polish-explanations.mjs:168 - Stripping diacritics from English terms and rewritten text allows dropped vocabulary to pass validation: original `'can' nghia la 'co the'` accepts `Em cần chọn nghĩa có thể.` because `cần` normalizes to `can`. - Preserve taught English terms with literal, case-insensitive matching; use diacritics-insensitive matching only for Vietnamese glosses.

