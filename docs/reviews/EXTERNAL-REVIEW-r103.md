# External Review - Round 103 (gemini)

Reviewer: gemini (real external run). Scope: commit 48a89ec, HEAD=null.
(Fired accidentally on the already-reviewed CR-103 commit while probing
the review script - findings below were still triaged honestly.)

[minor] src/components/flashcards/FlashcardScreen.tsx:127 - unhandled rejection hazard if ensureContentBank() rejects inside the async IIFE without an outer error boundary on the component state (though caught locally, setBuildError(true) is set, but dispatch error state should also be explicitly tracked or surfaced if needed) - ensure proper error state propagation to the user.

**Triage: NOT ACTIONABLE.** The catch already sets `buildError`, which
renders the recoverable retry panel (`flashcard-error` testid, verified
by the cr82-flashcards e2e "chunk failure shows the retry panel"). The
rejection IS handled; no extra surfacing exists to add.

[minor] src/games/GameRouteBoundary.tsx:112 - BankGate catches load failure by calling reloadPage(), which creates an infinite reload loop if the content bank asset is permanently unreachable or corrupted on the server - replace hard reload with a local error state and retry button.

**Triage: REAL, FIXED.** A permanently-broken bank chunk would reload
forever. Added `reloadPageOnce(scope)` in `src/lib/reload.ts` -
sessionStorage-stamped, max 2 auto-reloads per scope per tab - and
switched all four content-bank failure sites to it (App batch start,
ExamScreen begin, GameRouteBoundary BankGate, PlacementScreen). After
the bound the page stays put so the user can retry/navigate manually.
Manual reload buttons (GameRouteBoundary retry, identity-change reload
in App) stay unconditional - user-initiated or auth-critical.
Regression test: `src/lib/reload.test.ts` (2 tests).
