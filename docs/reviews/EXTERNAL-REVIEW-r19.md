# External Review - Round 19 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base cd1659a, HEAD=58d1745.

1. [major] src/lib/exam/wordOrder.ts:211 - Adjunct detection accepts verb complements as movable suffixes: “I look at a cat.” accepts “At a cat I look”; “I play with a ball.” accepts “With a ball I play.” Invalid answers now score correct - use curated alternate orders or restrict transformations to verified sentence patterns.

2. [major] src/lib/exam/wordOrder.ts:262 - Conjunct swapping exchanges adjacent tokens without identifying noun phrases. “I have a red pen and blue ruler.” accepts “I have a red blue and pen ruler.” - swap complete, validated conjunct phrases or whitelist authored alternates.

3. [major] src/components/InstructionSpeaker.tsx:56 - Autoplay permanently consumes its key before playback succeeds, while removing the retry control and status handling. Blocked/error playback leaves children with no way to hear the instruction - retain an accessible retry path and mark keys played only after successful playback.

4. [major] scripts/external-review.mjs:74 - Runner invokes `codex review`, whose Git execution is sandbox-blocked according to the supplied AGENTS.md instructions; the mandatory review cannot run through this path - compute the diff in the runner and feed it to `codex exec`, propagating failures.

5. [minor] src/lib/generators/describeAndChooseImage.ts:22 - Splitting on hyphens turns “X-ray” into “x”, producing “a X-ray”; the same bug exists in listeningSentenceFillBlank.ts:28 - check full-word exceptions before splitting and explicitly handle X-ray.

## Triage (post-review)

1. CONFIRMED + FIXED. `PP_COMPLEMENT_BONDS` (wordOrder.ts) - a PP headed
   by a preposition bound to the preceding verb ("look at", "play with",
   "listen to", "goes to"...) is a complement and no longer fronts. 4
   regression tests added; genuine adjuncts ("At seven I get up") still
   pass. Bank sweep re-verified clean.
2. CONFIRMED + FIXED. Conjunct swap now requires boundary words on both
   sides (CONJUNCT_BOUNDARY_LEFT/RIGHT): "a red pen and blue ruler" can no
   longer emit "a red blue and pen ruler"; bare-noun swaps ("maths and
   English") still accepted.
3. CONFIRMED + FIXED. InstructionSpeaker now releases the autoplay key on
   'blocked'/'error'/'unavailable' status and arms a one-shot pointerdown
   retry (a blocked browser allows speech after the first user gesture).
   Keys are consumed only after playback reports playing/ended. 3 new
   tests cover blocked-release, gesture retry, and played-key retention.
4. ALREADY FIXED before the review ran - the runner had been switched to
   `codex exec` with a locally-computed diff in the same commit series
   (the finding references the earlier `codex review` revision).
5. CONFIRMED + FIXED. article() checks the full word against the
   exception tables BEFORE splitting on hyphen/space; 'x-ray'/'xray'
   added to ARTICLE_AN_WORDS in both generators.

