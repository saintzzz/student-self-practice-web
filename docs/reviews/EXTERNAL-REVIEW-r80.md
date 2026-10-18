# External Review - Round 80 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 20efff0, HEAD=20efff0.

1. [major] src/components/PetCard.tsx:27 - `failed` persists when `src` changes. After one image error, pet evolution or replacement keeps showing the emoji and never attempts the new image; `key={src}` on the inner `<img>` cannot reset `PetImg` state. Fix: put `key={pet.art}` on the `<PetImg>` caller, or reset failure state when `src` changes.

Local inspection was blocked by execution policy. Review covers the supplied diff; deployed UI and assets remain unverified.

