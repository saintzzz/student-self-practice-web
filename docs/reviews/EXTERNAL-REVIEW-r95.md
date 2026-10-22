# External Review - Round 95 (gemini)

Reviewer: gemini (real external run). Scope: working tree, HEAD=22ebe2b.

[minor] scripts/external-review.mjs:77 - Unsanitized process.env.LLM_PROVIDER fallback or raw usage without allowlist validation could lead to invalid provider parameter injection if untrusted environment variables are passed. - Validate process.env.LLM_PROVIDER against a strict allowlist (e.g., 'auto', 'codex', 'gemini') before interpolation.
[minor] src/components/QuestionBanner.tsx:43 - Potential race condition / memory leak risk if speakInstruction's returned cleanup function is invoked during rapid component unmounting or state re-triggers before the previous utterance settles. - Ensure cancelRef.current?.() is cleanly called inside the useEffect cleanup return and right before invoking a new speakInstruction call.
[minor] src/games/GameZoneShelf.tsx:47 - Unbounded timeout lifecycle on rapid tapping in LockedCard poke handler without clearing previous timer refs reliably before setting new ones. - Ensure timer.current is properly checked and cleared before assignment on every click.

## Triage (by dev agent)

1. external-review.mjs provider injection - FIXED: LLM_PROVIDER now validated
   against the allowlist ['auto','codex','gemini'] before use.
2. QuestionBanner speak cleanup - NOT CONFIRMED: replay() already calls
   cancelRef.current?.() immediately before each new speakInstruction call
   (line 50), and the unmount effect cancels any in-flight utterance
   (line 47). The requested fix is the existing behavior.
3. GameZoneShelf timer leak - NOT CONFIRMED: poke() clears timer.current
   before every new setTimeout (line 61) and the unmount effect clears it
   (line 57). No unbounded timer exists.

Codex channel note: codex exec returned 401 workspace-routing errors on this
machine during the run window, so this round ran on the documented gemini-web
fallback. Rerun on codex when its auth is refreshed (iMac or `codex login`).
