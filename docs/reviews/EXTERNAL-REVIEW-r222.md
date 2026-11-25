# External Review - Round 222 (codex)

Reviewer: codex (real external run). Scope: commit 96c6c3d, HEAD=96c6c3d.

1. [severity major] src/lib/qb/bank.ts:276 - Quarantine removes the only cue from affected `image-to-word-mcq` rows while retaining the question and “Look at the picture” prompt, making answers guesswork. - Fix: exclude image-dependent rows when required art is quarantined; retain text-only rows only when independently answerable.

2. [severity major] src/components/ExamScreen.tsx:1695 - `imgFailed` persists across consecutive MCQs because `PromptLine` is reused without a question key. One failed image suppresses subsequent valid question images. - Fix: scope failure to the failed URL or remount per question.

3. [severity minor] src/games/games/TreasureChest.tsx:115 - Opening the chest clears `imageUrl`, but `EmojiVisual` retains its mount-time `image` mode, rendering an empty visual instead of 🎁 during the reward animation. - Fix: key the component by closed/open state.

4. [severity minor] src/games/mechanics.tsx:80 - All-or-nothing art checks URL presence only. A load failure still falls back individually, leaving mixed art and potentially a distinctive answer cue. Same defect in `OddOneOut.tsx:70`. - Fix: wire `onImageError` to per-round group failure state and remount every option into emoji mode.

