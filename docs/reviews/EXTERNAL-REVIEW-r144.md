# External Review - Round 144 (codex)

Reviewer: codex (real external run). Scope: commit 39ccfda, HEAD=39ccfda.

1. [severity major] src/games/mechanics.tsx:109 - Options reuse `EmojiVisual` by index across rounds, but its render mode initializes only on mount. An image-backed slot followed by a word without art renders blank; a slot that falls back never tries subsequent art - key each visual by word ID/image URL, or reset its state when visual identity changes.

2. [severity major] scripts/artgen/build-vocab-images.mjs:19 - Regeneration replaces the committed `/images/vocab/` mappings with `/images/concepts/` paths and performs no attribution approval check, undoing the documented ADR-5 publishing contract - generate from approved attribution records and publish matching vocab files deterministically.

3. [severity minor] src/games/mechanics.tsx:125 - Ambient `animationDelay` also delays `game-hit`: fish indexes 2/3 wait 680/1,020ms, exceeding the 500ms correct-answer advance, so their burst never appears. Balloon/food later indexes have the same problem - apply stagger delays only to ambient animations and use zero delay for feedback.

