# External Review - Round 154 (codex)

Reviewer: codex (real external run). Scope: commit 3218cd0, HEAD=3218cd0.

1. [severity major] src/components/AuthScreen.tsx:42 - The hero occupies 58vh, so `-mt-[26vh]` leaves 32vh of empty space above the form. At 375×667, this consumes 213px and pushes the submit CTA below the fold; desktop 840px height also leaves insufficient room for the card. This contradicts CR-117’s acceptance criterion. Fix with responsive, capped top spacing and verify submit visibility at both sizes.

