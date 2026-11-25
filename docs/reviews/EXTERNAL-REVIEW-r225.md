# External Review - Round 225 (codex)

Reviewer: codex (real external run). Scope: commit 7809491, HEAD=7809491.

1. [severity major] src/components/PicturePairMatchingQuestion.tsx:176 - One image failure blanks the other three picture tiles: removing their `imageUrl` leaves mounted `EmojiVisual`s in `image` mode. Reproduced in React/jsdom. - Key each visual on the art/fallback state, as `ListeningImageChoiceQuestion` already does; apply the same fix to the new counting option groups.

2. [severity major] src/components/CountingImageQuestion.tsx:47; src/components/DescribeAndChooseImageQuestion.tsx:66 - Counting option art is unreachable with the current bank: enumerating generated topic questions yields **0/3,130** count-to-image and **0/3,749** describe questions satisfying `every(countingArtUrl)`. Required same-object/different-count distractors lack matching assets. - Complete art coverage for co-occurring options while preserving distractor rules; add generator-backed tests proving both renderers actually display art.

