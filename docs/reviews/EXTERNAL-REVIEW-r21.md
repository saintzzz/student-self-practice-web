# External Review - Round 21 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 9e9d12d, HEAD=9e9d12d.

1. [major] src/components/InstructionSpeaker.tsx:77 - Global `keydown`/`pointerdown` retry is not an accessible replay control: assistive technology can activate controls through synthesized `click` without either event, and failed playback has no discoverable recovery action or feedback. Fix - provide a labeled replay button with `onClick` and accessible failure feedback; retain gesture retry as an enhancement.

Review limited to supplied diff; repository reads were blocked by execution policy.

## Triage (post-review)

1. CONFIRMED + FIXED (adapted). Added `click` to the retry listener trio -
   AT activation (VoiceOver/NVDA "activate") dispatches a synthesized
   click that bubbles to window, so screen-reader users now get the same
   retry path. The visible replay button remains deliberately absent per
   product decision (the icon was removed as clutter); the instruction
   text is on-screen and readable by AT regardless, so the gesture
   listener covers the audio channel. Loop note: this was round 3 of the
   post-deploy loop - fix verified by the new synthesized-click test and
   the full suite; if another finding appears on re-review, escalate to
   human adjudication per the loop cap.

