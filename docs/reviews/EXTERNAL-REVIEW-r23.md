# External Review - Round 23 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base 554b34f, HEAD=348a27d.

1. [major] src/components/QuestionCard.tsx:291 - `sm:p-6` and `[@media(max-height:420px)]:p-2` override the feedback reservation’s base `padding-bottom`. At desktop widths or short viewport heights, the fixed sheet can cover the final answers without enough scroll space to reveal them. - Apply the conditional bottom reservation through inline `paddingBottom` or matching responsive overrides so it survives both padding rules.

Diff-only review; local inspection was policy-blocked, so deployed behavior was not verified.

## Triage

1. CONFIRMED + FIXED - `QuestionCard.tsx`: reservation moved from the
   conditional `pb-[calc(...)]` class to inline `style.paddingBottom`, so
   `sm:p-6` and `[@media(max-height:420px)]:p-2` responsive variants can
   no longer override it. Playwright-verified on the production build:
   1280x844 -> computed paddingBottom 408px; 844x390 -> 244px
   (= min(40vh,320px)+5.5rem). Sheet pinned at viewport bottom both ways.

Gates: tsc clean, 20/20 QuestionCard tests, vite build green.

