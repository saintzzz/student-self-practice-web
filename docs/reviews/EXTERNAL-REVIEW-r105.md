# External Review - Round 105 (codex)

Reviewer: codex (real external run). Scope: base e151d28, HEAD=36a7a27.

1. [severity major] src/components/ExamScreen.tsx:1221 - `isPractice` includes arena and review modes, so bank questions there expose “Dạy tôi”, violating assessment restrictions and potentially removing arena items from scoring. - Gate rendering and `teach()` with `mode === 'practice'`.

2. [severity major] src/lib/qb/bank.ts:603 - Taught questions retain an undefined verdict, so finishing the sitting sends them to the scoring oracle despite the answer-time skip. Offline/rate-limited scoring can block completion of an entirely taught sitting. - Exclude `bankTaught` rows from scoring batches and the `finishExam` pending check.

3. [severity major] src/components/ExamScreen.tsx:658 - Teaching and answering can run concurrently: answer controls remain active during teaching, and teaching remains available while scoring is pending. This can credit telemetry/quests for a taught item and display a late lesson on another question. - Mutually exclude teaching, answering and submission; bind async completion to the originating sitting/question.

4. [severity major] src/lib/qb/bank.ts:632 - Hydration globally marks previously taught questions ungraded, including fixed-form exams and assignments. A learner can teach known form items beforehand to remove them from the client’s score denominator; server grading still running does not prevent this exclusion. - Apply attempted-not-scored handling only to eligible practice sittings; retain grading for fixed assessments.

