import { test, expect } from '@playwright/test';
import {
  startBatch,
  readRoundProgress,
  readRoundScoreSummary,
  goToNextRound,
  runExtraLetterRound,
  runListeningSentenceRound,
} from './utils/batch-flow';
import { currentQuestionKind } from './utils/practice-flow';

/**
 * Covers plan.md v5 AC17/AC18 (Round 2 of the Batch/Round model): the
 * listening-sentence-fill-blank round, reached immediately after completing
 * Round 1. Round 2 reuses play-audio-button/answer-input/
 * submit-answer-button/answer-feedback verbatim (plan.md "Data-Testid
 * Contract Additions") -- only the content is now a cloze sentence instead
 * of a bare word.
 *
 * This test runs its own independent Round 1 pass first (Round 2 cannot be
 * reached any other way in the fixed 4-round Batch order) but does not
 * assert on Round 1's own behavior in depth -- that is round1-extra-letter
 * .spec.ts's job. This test is independent of that spec: it starts its own
 * fresh Batch and does not depend on any state left behind by another test.
 *
 * Uses the guaranteed-wrong-then-discover technique (a digits-only guess can
 * never match a real English word) so every answer is deterministically
 * marked incorrect while still revealing the correct word via
 * answer-feedback. This proves the reveal-after-any-interaction contract
 * across the whole round without ever hardcoding sentence/vocabulary
 * content, and also gives a fully predictable expected round score (0
 * correct) to check the round-score-summary against.
 */
test.describe('Batch/Round: Round 2 (listening-sentence-fill-blank)', () => {
  test('reaches Round 2 after Round 1, exercises audio playback without a page crash, and shows a round score summary', async ({
    page,
  }) => {
    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);

    await test.step('Round 2 begins at round 2 of 4 with listening-sentence-fill-blank questions', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(2);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKind(page, 'listening-sentence-fill-blank');
    });

    const round2 = await test.step(
      'answer every Round 2 question with a guaranteed-wrong guess, exercising play-audio-button (incl. "listen again") on the first question without a page crash',
      async () => {
        return runListeningSentenceRound(page, { verifyAudioResilience: true });
      },
    );

    await test.step('play-audio-button never threw an uncaught page error, even with zero TTS voices available headlessly', async () => {
      expect(
        round2.pageErrors,
        `page threw uncaught error(s) after clicking play-audio-button: ${round2.pageErrors
          .map((error) => error.message)
          .join('; ')}`,
      ).toEqual([]);
    });

    await test.step('Round 2 has roughly 10 questions (plan.md AC17) and every guaranteed-wrong guess was marked incorrect', async () => {
      // Tolerant range, same reasoning as round1-extra-letter.spec.ts: AC17
      // says "~10 questions", not a literal fixed 10.
      expect(round2.totalQuestions).toBeGreaterThanOrEqual(8);
      expect(round2.totalQuestions).toBeLessThanOrEqual(12);
      expect(round2.correctCount).toBe(0);
      expect(round2.incorrectCount).toBe(round2.totalQuestions);
      // A real (non-empty) word/sentence-target was revealed every time,
      // never hardcoded.
      expect(round2.revealedWords).toHaveLength(round2.totalQuestions);
      expect(round2.revealedWords.every((word) => word.length > 0)).toBe(true);
    });

    await test.step('round score summary reflects 0 correct out of the total answered (never a hardcoded expected score)', async () => {
      const roundScore = await readRoundScoreSummary(page);
      expect(roundScore.total).toBe(round2.totalQuestions);
      expect(roundScore.current).toBe(0);
    });
  });
});
