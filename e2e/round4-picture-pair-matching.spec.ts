import { test, expect, type Page } from '@playwright/test';
import { fastForwardThroughRounds1And2, goToNextRound } from './utils/batch-flow';
import { goToNextQuestion, readElementOutcome } from './utils/practice-flow';
import { runPronunciationRecordingRoundFallback } from './utils/round34-flow';
import {
  advanceToPicturePairMatching,
  findMatchByElimination,
  forceMistakeLimitExceeded,
  pairTiles,
  readMistakeCount,
} from './utils/pair-matching-flow';

/**
 * Covers plan.md v8 "Round 4 Addition: Picture-Pair-Matching Board" / AC31,
 * AC32.
 *
 * IMPORTANT -- READ BEFORE INTERPRETING A FAILURE HERE: this spec was
 * written against the plan.md v8 spec text BEFORE picture-pair-matching had
 * any real implementation. Per plan.md v8's own "File Ownership" section,
 * the Round 4 addition is built sequentially AFTER the Round 2
 * listening-image-choice addition lands (both touch the same shared
 * integration files -- roundDefinitions.ts/App.tsx/types.ts/
 * QuestionCard.tsx -- so they cannot be built concurrently). At the time
 * this file was written, Round 4's pool was still 100%
 * describe-and-choose-image with zero picture-pair-matching questions.
 * Every test below will fail with a clear "expected at least one
 * picture-pair-matching question" error (from advanceToPicturePairMatching
 * returning null, surfaced via reachPicturePairMatching's assertion) until
 * that later task lands -- this is the EXPECTED signal of a not-yet-built
 * sequential task, not a test bug. Re-run this spec after the Round 4
 * addition lands to get real pass/fail signal.
 *
 * See ./utils/pair-matching-flow.ts's file doc comment for the full list of
 * DOM/behavior assumptions this suite makes about the board. Never hardcodes
 * any vocabulary/word/emoji content -- word vs. picture tiles are told apart
 * structurally (does the tile's text look like plain English letters, or
 * not), and the correct pairing is discovered by trial against the board's
 * own post-attempt styling signal, per this task's instructions.
 *
 * Reaches Round 4 the same way round4-describe-and-choose-image.spec.ts does
 * (forced speech-recognition-unsupported fallback through Round 3, since
 * headless Chromium has no real mic anyway) -- see that spec's doc comment
 * for the rationale. Each test starts its own fresh Batch and is
 * independent of every other spec file in this suite.
 */
async function reachPicturePairMatching(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Round 3 is not under test here -- forced through its
    // speech-recognition-unsupported fallback path deterministically, same
    // rationale as round4-describe-and-choose-image.spec.ts.
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.SpeechRecognition;
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.webkitSpeechRecognition;
  });

  await fastForwardThroughRounds1And2(page);
  await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
  await goToNextRound(page);

  const foundAt = await advanceToPicturePairMatching(page);
  expect(
    foundAt,
    'expected at least one picture-pair-matching question within this Round 4 pass (plan.md v8 AC31) -- got none. ' +
      'This is the expected signal if the picture-pair-matching addition has not landed yet (built sequentially ' +
      "after Round 2's listening-image-choice per plan.md v8 File Ownership), not a test bug.",
  ).not.toBeNull();
}

test.describe('Batch/Round: Round 4 picture-pair-matching board (v8 addition)', () => {
  test('renders exactly 8 pair tiles, and a correctly-matched pair stays revealed with a correct styling signal', async ({
    page,
  }) => {
    await reachPicturePairMatching(page);

    const tileCount = await pairTiles(page).count();
    expect(tileCount, 'expected exactly 8 pair-tile-{index} elements (4 word + 4 picture, plan.md v8)').toBe(8);

    const match = await findMatchByElimination(page);
    expect(
      match.mistakesMade,
      'finding a real match by elimination against all 4 picture tiles should need at most 3 wrong tries first, ' +
        'staying within AC32\'s "up to 3 mistakes allowed" budget',
    ).toBeLessThanOrEqual(3);

    await test.step('the matched pair keeps showing a correct styling signal (stays revealed, does not reset like a wrong attempt)', async () => {
      const wordOutcome = await readElementOutcome(pairTiles(page).nth(match.wordTileIndex));
      const pictureOutcome = await readElementOutcome(pairTiles(page).nth(match.matchedPictureTileIndex));
      expect(wordOutcome, 'the matched word tile must show a correct styling signal').toBe('correct');
      expect(pictureOutcome, 'the matched picture tile must show a correct styling signal').toBe('correct');
    });
  });

  test('exceeding the 3-mistake budget marks the board incorrect and reveals the correct pairing (AC32)', async ({
    page,
  }) => {
    await reachPicturePairMatching(page);

    const mistakesMade = await forceMistakeLimitExceeded(page, 4);
    expect(mistakesMade).toBe(4);

    await test.step('pair-matching-mistake-count reflects the forced mistakes, exceeding the 3-mistake budget', async () => {
      const mistakeFraction = await readMistakeCount(page);
      expect(
        mistakeFraction.current,
        `expected pair-matching-mistake-count to show at least 4 mistakes after 4 forced guaranteed-wrong ` +
          `word-vs-word attempts (AC32: "exceeding 3 mistakes marks it incorrect"), got ${mistakeFraction.current}`,
      ).toBeGreaterThanOrEqual(4);
    });

    await test.step('the board reveals the correct pairing once the mistake budget is exceeded (AC32)', async () => {
      const tiles = pairTiles(page);
      const tileCount = await tiles.count();
      let revealedCorrectCount = 0;
      for (let i = 0; i < tileCount; i++) {
        const outcome = await readElementOutcome(tiles.nth(i));
        if (outcome === 'correct') revealedCorrectCount++;
      }
      expect(
        revealedCorrectCount,
        'expected all 8 tiles (4 pairs) to show a correct styling signal once the board is marked incorrect and ' +
          `the correct pairing is revealed (plan.md v8 AC32), but only ${revealedCorrectCount}/8 did`,
      ).toBe(8);
    });

    await test.step('the board is advanceable via next-button after being marked incorrect (never blocks the Batch)', async () => {
      await goToNextQuestion(page);
    });
  });
});
