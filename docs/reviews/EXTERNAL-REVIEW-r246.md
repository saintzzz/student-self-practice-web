# External Review - Round 246 (codex)

Reviewer: codex (real external run). Scope: commit 444d8c2, HEAD=444d8c2.

1. [severity major] src/lib/content/imageSemantics.ts:88 - Removing `grape` from the exclusion set enables counting questions whose fallback still repeats 🍇 bunches. Any image failure drops the entire group to emoji, so “3 grapes” shows three bunches; describe-question accessible labels also announce bunches. - Provide a single-grape fallback and matching accessible labels before restoring counting eligibility; test image-error and missing-art paths.

2. [severity major] scripts/artgen/run-flow.mjs:69 - The settling loop returns success after 60 seconds even when generation remains active. An in-memory simulation confirmed this. A late second output can then arrive after the next asset’s snapshot and be saved under that asset’s ID, permanently poisoning its resume marker. - Require generation completion before advancing, abort on settling timeout, and associate downloaded images with the submitted request rather than any fresh page image.

3. [severity minor] public/images/concepts/concept-grape-fc24e5.webp:1 - Replacement bytes retain the previous artwork’s approved attribution record: `sourceSha256` declares `fc4b8f58…`, but the file hashes to `24e87fd6…`; the provider still says `openai-chatgpt-image` despite the Flow replacement. - Re-review the replacement and update its provider, approval metadata, and bound digest in `public/attribution.json`.

