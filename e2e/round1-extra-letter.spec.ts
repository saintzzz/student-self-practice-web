import { test, expect } from '@playwright/test';
import {
  startBatch,
  readRoundProgress,
  readRoundScoreSummary,
  goToNextRound,
  runExtraLetterRound,
  type RoundRunResult,
} from './utils/batch-flow';
import { currentQuestionKind, currentQuestionKindOneOf } from './utils/practice-flow';

/**
 * Covers plan.md v5 AC17 (Round 1 of the new Batch/Round interaction model)
 * and the v5 E2E test strategy's Round 1 scenario: Grade -> Start a Batch ->
 * Round 1 (extra-letter) answered end-to-end -> round score summary ->
 * Round 2 begins.
 *
 * Round 1 reuses the pre-existing extra-letter mechanic and its testids
 * (letter-tile-{index}, answer-feedback, next-button, question-progress) as
 *-is per plan.md ("Round 1 - Extra Letter (reused as-is)"). No vocabulary
 * word is ever hardcoded here: every question's correct answer is
 * discovered at runtime from the app's own answer-feedback reveal (see
 * ./utils/practice-flow.ts's answerExtraLetterTile / findExtraLetterTileIndex
 * and ./utils/batch-flow.ts's runExtraLetterRound for the shared discovery
 * technique this spec relies on).
 */
test.describe('Batch/Round: Round 1 (extra-letter)', () => {
  test('answers every Round 1 question, shows a round score summary, and advances into Round 2', async ({
    page,
  }) => {
    await startBatch(page);

    await test.step('Round 1 begins at round 1 of 4 with extra-letter questions', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(1);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKind(page, 'extra-letter');
    });

    let round1: RoundRunResult;

    await test.step('answer every Round 1 question, discovering the correct tile from revealed answer-feedback each time', async () => {
      round1 = await runExtraLetterRound(page);

      // plan.md AC17 says "~10 questions each" -- checked as a tolerant
      // range rather than an exact literal 10 so this does not become brittle
      // if the generator's per-round count shifts slightly.
      expect(
        round1.totalQuestions,
        'Round 1 should have roughly 10 questions per plan.md AC17',
      ).toBeGreaterThanOrEqual(8);
      expect(round1.totalQuestions).toBeLessThanOrEqual(12);

      // Every question produced a definite correct/incorrect outcome (no
      // 'neutral'/'unknown' outcomes slipped through unnoticed).
      expect(round1.correctCount + round1.incorrectCount).toBe(round1.totalQuestions);

      // Every question's answer-feedback revealed a real (non-empty) word,
      // proving the reveal-after-any-interaction contract held for all 10
      // questions, not just the first.
      expect(round1.revealedWords).toHaveLength(round1.totalQuestions);
      expect(round1.revealedWords.every((word) => word.length > 0)).toBe(true);
    });

    await test.step('round score summary reflects the real tally observed while answering (never a hardcoded expected score)', async () => {
      const roundScore = await readRoundScoreSummary(page);
      expect(roundScore.total).toBe(round1.totalQuestions);
      expect(roundScore.current).toBe(round1.correctCount);
    });

    await test.step('advancing past the round score summary begins Round 2 (listening, either v8 kind)', async () => {
      await goToNextRound(page);
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(2);
      expect(roundProgress.total).toBe(4);
      // v8 mixes listening-image-choice into Round 2's pool alongside
      // listening-sentence-fill-blank (plan.md v8 AC30), so the first
      // question can legitimately be either kind.
      await currentQuestionKindOneOf(page, ['listening-sentence-fill-blank', 'listening-image-choice']);
    });
  });
});
