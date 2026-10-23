# External Review - Round 108 (codex)

Reviewer: codex (real external run). Scope: base e151d28, HEAD=9914597.

1. [severity major] src/components/ExamScreen.tsx:738 - `untimed` also includes review sittings, so a server-returned `taught:true` removes review questions from scoring and skips their outcome/quest credit despite the practice-only restriction. Submission repeats this at line 324. - Pass `mode === 'practice'` as `honorTaught` in both paths.

2. [severity minor] src/components/ExamScreen.tsx:1263 - Successful teaching removes the focused “Dạy tôi” button and inserts the lesson without focus management or a live announcement. Keyboard and screen-reader users lose their position and receive no indication that the lesson opened. - Focus a programmatically focusable lesson heading when the response arrives, and restore focus to the question after dismissal.

