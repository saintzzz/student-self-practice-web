# External Review - Round 106 (codex)

Reviewer: codex (real external run). Scope: base e151d28, HEAD=4423cd4.

1. [severity major] src/components/ExamScreen.tsx:672 - Teaching can overlap submission: `finishExam()` ignores `teachBusy`, and the teach callback mutates finished or replacement sittings without checking identity. Submission can score a disclosed question or overwrite its taught flag, making results depend on response order. - Mutually exclude teaching and submission using synchronous refs; bind teach completion to the originating sitting and reject stale callbacks.

2. [severity major] src/components/ExamScreen.tsx:722 - A server-returned `taught:true` marks the question ungraded during hydration, but the answer handler still records telemetry, adaptive outcomes, skill/quest credit, and a correct/wrong verdict. This occurs when another tab teaches an already-fetched question. - Check the hydrated taught flag before awarding credit or recording outcomes; show the taught verdict and skip all scoring counters.

