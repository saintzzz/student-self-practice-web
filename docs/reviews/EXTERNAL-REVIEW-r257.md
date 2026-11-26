# External Review - Round 257 (codex)

Reviewer: codex (real external run). Scope: commit cb9f8c8, HEAD=cb9f8c8.

1. [severity minor] scripts/artgen/run-flow-video.mjs:54 - The boundary includes composer text that disappears on submission. A short rejection can leave the body shorter than that boundary, so lines 78–79 discard it and wait eight minutes. Reproduced with the extracted detector: 346 characters before submission, 56 afterward, error missed. - Fix: track response nodes or message IDs independently of the composer.

2. [severity minor] src/components/MotionToggle.tsx:21 - Changing the accessible name while exposing `aria-pressed={!on}` produces contradictory announcements: “Bật video chuyển động, pressed” when motion is disabled. - Fix: use a stable label with `aria-pressed={on}`, or retain the changing action label and remove `aria-pressed`.

