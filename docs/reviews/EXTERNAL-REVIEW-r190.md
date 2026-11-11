# External Review - Round 190 (codex)

Reviewer: codex (real external run). Scope: commit 73951a7, HEAD=73951a7.

1. [minor] [src/components/ExamScreen.tsx:650](/Users/kazu.nx/devin_app/student-self-practice-web/src/components/ExamScreen.tsx:650) - Starting a new sitting clears the verdict but not `combo`, so retrying after a result can carry the previous sitting’s streak into the new one - reset `combo` to `0` in `begin()`.

