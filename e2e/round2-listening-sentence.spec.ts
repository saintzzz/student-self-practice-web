import { test, expect } from '@playwright/test';
import {
  startBatch,
  readRoundProgress,
  readRoundScoreSummary,
  goToNextRound,
  runExtraLetterRound,
  runListeningSentenceRound,
} from './utils/batch-flow';
import { currentQuestionKindOneOf } from './utils/practice-flow';

/**
 * Covers plan.md v5 AC17/AC18 and v8 AC30 (Round 2 of the Batch/Round
 * model): the listening round, reached immediately after completing Round
 * 1. As of plan.md v8 ("Round 2 Addition: Listening Image-Choice"), Round
 * 2's pool mixes TWO kinds -- listening-sentence-fill-blank (typing,
 * reuses play-audio-button/answer-input/submit-answer-button/answer-feedback
 * verbatim) and listening-image-choice (no typing, reuses the
 * option-{index} 4-option shell) -- rather than being 100% one kind, per
 * plan.md v8's "Architecture note" ("Round 2 -- entirely about listening --
 * mixes kind values, not literally one exact kind string").
 *
 * This test runs its own independent Round 1 pass first (Round 2 cannot be
 * reached any other way in the fixed 4-round Batch order) but does not
 * assert on Round 1's own behavior in depth -- that is round1-extra-letter
 * .spec.ts's job. This test is independent of that spec and of
 * round2-listening-image-choice.spec.ts (item 2's deeper listening-
 * image-choice-only coverage): it starts its own fresh Batch and does not
 * depend on any state left behind by another test.
 *
 * Branches per-kind for answering, using the same no-hardcoded-vocabulary
 * discover-the-answer technique as the rest of this suite (see
 * ./utils/batch-flow.ts's runListeningSentenceRound doc comment for exactly
 * how each branch works): a guaranteed-wrong typed guess for
 * listening-sentence-fill-blank (a digits-only string can never match a
 * real English word), and a structural option-index-0 click plus discovery
 * -from-post-answer-styling for listening-image-choice (a click-based UI has
 * no "guaranteed wrong" equivalent to a digits-only string, so this branch's
 * outcome is genuinely correct or incorrect, tallied for real rather than
 * assumed).
 */
test.describe('Batch/Round: Round 2 (mixed listening-sentence-fill-blank + listening-image-choice, v8)', () => {
  test('reaches Round 2 after Round 1, contains both listening kinds, exercises audio playback without a page crash, and shows a round score summary', async ({
    page,
  }) => {
    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);

    await test.step('Round 2 begins at round 2 of 4 with a listening question (either kind)', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(2);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKindOneOf(page, ['listening-sentence-fill-blank', 'listening-image-choice']);
    });

    const round2 = await test.step(
      'answer every Round 2 question (branching per kind), exercising play-audio-button (incl. "listen again") on the first question without a page crash',
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

    await test.step('Round 2 has roughly 10 questions (plan.md AC17) and every question produced a definite correct/incorrect outcome', async () => {
      // Tolerant range, same reasoning as round1-extra-letter.spec.ts: AC17
      // says "~10 questions", not a literal fixed 10.
      expect(round2.totalQuestions).toBeGreaterThanOrEqual(8);
      expect(round2.totalQuestions).toBeLessThanOrEqual(12);
      expect(round2.correctCount + round2.incorrectCount).toBe(round2.totalQuestions);
      // A real (non-empty) word/option-text answer key was revealed every
      // time, never hardcoded.
      expect(round2.revealedWords).toHaveLength(round2.totalQuestions);
      expect(round2.revealedWords.every((word) => word.length > 0)).toBe(true);
    });

    await test.step('both Round 2 kinds actually appeared in this pass (plan.md v8 AC30)', async () => {
      expect(
        round2.kindCounts['listening-sentence-fill-blank'],
        `expected at least one listening-sentence-fill-blank question in this ${round2.totalQuestions}-question Round 2 pass, got 0 -- ` +
          'either this is an unlucky sampling draw worth re-running, or listening-sentence-fill-blank regressed out of the pool',
      ).toBeGreaterThan(0);
      expect(
        round2.kindCounts['listening-image-choice'],
        `expected at least one listening-image-choice question in this ${round2.totalQuestions}-question Round 2 pass (plan.md v8 AC30), ` +
          'got 0 -- this is the expected signal if the v8 listening-image-choice addition has not landed yet, not a test bug',
      ).toBeGreaterThan(0);
      expect(round2.kindCounts['listening-sentence-fill-blank'] + round2.kindCounts['listening-image-choice']).toBe(
        round2.totalQuestions,
      );
    });

    await test.step('round score summary reflects the real tally observed while answering (never a hardcoded expected score)', async () => {
      const roundScore = await readRoundScoreSummary(page);
      expect(roundScore.total).toBe(round2.totalQuestions);
      expect(roundScore.current).toBe(round2.correctCount);
    });
  });
});
