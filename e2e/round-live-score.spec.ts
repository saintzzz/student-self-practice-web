import { test, expect } from '@playwright/test';
import { startBatch } from './utils/batch-flow';
import { answerExtraLetterTile, currentQuestionKind, goToNextQuestion, readQuestionProgress } from './utils/practice-flow';
import { liveScoreLocator, readLiveScore } from './utils/timer-flow';

/**
 * Covers plan.md v7 AC26 (Live Score Display): a running `live-score`
 * indicator visible during an active Round's question loop, updating
 * immediately after each answered question to reflect the real correct/
 * answered tally so far (X = correct answers so far, Y = questions answered
 * so far -- not the full round total, since unanswered questions have not
 * been seen yet).
 *
 * Written BEFORE a real v7 implementation existed (built by another agent in
 * parallel). If `live-score` does not render yet, these tests fail with a
 * "no element found" / not-visible timeout -- that is the expected signal of
 * an in-progress parallel build, not a test bug. See
 * plans/reports/tester-260831-student-self-practice-v7-score-timer.md for
 * pass/fail status.
 *
 * Uses Round 1 (extra-letter) as the vehicle -- the same tile-index-0-click,
 * discover-the-real-outcome-from-answer-feedback technique as
 * round1-extra-letter.spec.ts (via answerExtraLetterTile), so no vocabulary
 * word is ever hardcoded and the expected running tally is computed from the
 * app's own real per-question outcomes, never assumed.
 */
test.describe('Batch/Round: live score indicator (AC26)', () => {
  test('live-score is visible from the start of Round 1, showing 0 answered before any question is answered', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    await expect(
      liveScoreLocator(page),
      'expected live-score to be visible as soon as an active Round begins (plan.md v7 AC26), before any question is answered',
    ).toBeVisible();

    const initialScore = await readLiveScore(page);
    expect(
      initialScore.total,
      `expected live-score's answered-count to be 0 before any question in Round 1 is answered, got "${initialScore.total}"`,
    ).toBe(0);
  });

  test('live-score updates to the real running correct/answered tally immediately after each answered question', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    const { total } = await readQuestionProgress(page);
    // "answer a couple of questions" -- sampling a few is sufficient to prove
    // the running-update behavior without re-answering an entire ~10
    // question round (that full-round tally check already exists in
    // round1-extra-letter.spec.ts for round-score-summary).
    const questionsToSample = Math.min(3, total);
    let correctSoFar = 0;

    for (let q = 1; q <= questionsToSample; q++) {
      const result = await answerExtraLetterTile(page, 0);
      if (result.outcome === 'correct') correctSoFar++;
      else if (result.outcome !== 'incorrect') {
        throw new Error(`Round 1 question ${q}: unrecognized answer outcome "${result.outcome}"`);
      }

      // Checked right after answering (before Next is clicked), matching
      // plan.md v7's "update it immediately after each question is
      // answered, same moment the per-question feedback appears".
      const liveScore = await readLiveScore(page);
      expect(
        liveScore.total,
        `expected live-score's answered-count to be ${q} right after answering question ${q}, got "${liveScore.total}"`,
      ).toBe(q);
      expect(
        liveScore.current,
        `expected live-score's correct-count to be ${correctSoFar} (the real running tally observed while answering), ` +
          `after question ${q}, got "${liveScore.current}"`,
      ).toBe(correctSoFar);

      if (q < questionsToSample) {
        await goToNextQuestion(page);
      }
    }
  });
});
