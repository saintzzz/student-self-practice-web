# External Review - Round 107 (codex)

Reviewer: codex (real external run). Scope: base e151d28, HEAD=5375d13.

1. [severity major] supabase/migrations/0052_teach_me_lessons.sql:222 - Replacing `score_bank_attempts` drops migration 0049’s `sba_ip_calls` and weighted `sba_ip` limits. Multiple accounts on one IP can bypass the existing aggregate protection and extract more answer keys. - Preserve the IP checks alongside the UID/global limits.

2. [severity major] src/components/ExamScreen.tsx:666 - `teach()` ignores `finishingRef.current`, and its button remains enabled while submission awaits scoring. Teaching can therefore start after submission starts; scoring can finish before teaching resolves, counting a disclosed question and discarding its lesson. - Reject teaching during submission using the synchronous finishing ref, disable the button during submission, and use a synchronous teaching ref to enforce mutual exclusion.

