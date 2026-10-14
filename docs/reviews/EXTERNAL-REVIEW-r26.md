# External Review - Round 26 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit d3d6725, HEAD=d3d6725.

1. [major] src/lib/phonics/initialSounds.ts:207 - When the answer is `x-ray`, exclusion removes its only example: audio becomes bare `x` (“ex”) and the visual scaffold disappears. This reintroduces the letter-name confusion the feature addresses. - Provide a suitable alternate anchor with matching audio and visual, or exclude this question until supported.

2. [minor] src/lib/phonics/initialSounds.ts:192 - Every render filters and sorts the entire vocabulary twice: once for `getSoundExample`, again through `getSoundUtterance`. Playback and answer updates repeat this synchronous work on children’s devices. - Cache candidates per sound and derive both scaffold and utterance from one selected example.

Review limited to the supplied diff; repository inspection was blocked by execution policy.


## Triage (dev lead)

- **F1 (major) x-ray/bare-'x'** - NOT CONFIRMED, unreachable: 'x-ray' maps to sound 'e' via
  INITIAL_SOUND_EXCEPTIONS, and zero bank words resolve to sound 'x' (verified:
  `ALL_WORDS.filter(w => getInitialSound(w.word) === 'x')` = []). The word-choice generator
  derives `sound` from the answer word, so no 'x'-sound question is ever generated and the
  exclude-everything path cannot be hit. The 'x' key stays in SOUND_KEYS defensively - if the
  bank ever gains a real x-word, candidates derive automatically.
- **F2 (minor) double filter+sort per render** - CONFIRMED, fixed: `soundExampleCandidates`
  memoized per sound key in EXAMPLE_CANDIDATES map (commit follows).
