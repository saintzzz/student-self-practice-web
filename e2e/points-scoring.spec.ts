import { test, expect } from '@playwright/test';
import {
  fastForwardThroughRounds1And2,
  goToNextRound,
  runExtraLetterRound,
  startBatch,
} from './utils/batch-flow';
import { answerExtraLetterTile, currentQuestionKind, goToNextQuestion, readQuestionProgress } from './utils/practice-flow';
import { runDescribeAndChooseImageRound, runPronunciationRecordingRoundFallback } from './utils/round34-flow';
import { findPointsFraction, readLiveScorePoints } from './utils/points-flow';

/**
 * Covers plan.md v10 ("IOE-Style Points Scoring") AC34-AC36: flat 10 points
 * per correct answer / 0 for wrong or unanswered, with points-out-of-max
 * shown on the Round summary and the Batch summary's headline.
 *
 * Written against plan.md's spec text, not the implementation -- every
 * expected points value below is computed from what this suite's own
 * helpers actually observed happening during the test (real correct/
 * incorrect tallies from clicking through questions), never a hardcoded
 * point total, per this task's instructions. No exact new data-testid is
 * assumed for the points figures themselves (plan.md v10 did not pin one) --
 * see ./utils/points-flow.ts for the "N điểm" / "X/Y điểm" text-pattern
 * discovery technique used instead, matching this suite's established
 * discovery-over-hardcoding discipline.
 *
 * If a points figure is not found anywhere expected, these tests fail with
 * a clear "not found"/not-visible error -- the expected signal of an
 * in-progress or differently-shaped v10 build, not a test bug.
 */
test.describe('Points scoring (plan.md v10 AC34-AC36)', () => {
  test('live-score running point total equals (correct answers so far) x 10 while answering a mix of Round 1 questions (AC34, AC35)', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    const { total } = await readQuestionProgress(page);
    // Sampling a handful of questions (not the full ~10) is enough to prove
    // the running-update behavior across a real mix of correct/incorrect
    // outcomes, same sampling precedent as round-live-score.spec.ts.
    const questionsToSample = Math.min(5, total);
    let correctSoFar = 0;

    for (let q = 1; q <= questionsToSample; q++) {
      const result = await answerExtraLetterTile(page, 0);
      if (result.outcome === 'correct') correctSoFar++;
      else if (result.outcome !== 'incorrect') {
        throw new Error(`Round 1 question ${q}: unrecognized answer outcome "${result.outcome}"`);
      }

      const points = await readLiveScorePoints(page);
      expect(
        points,
        `expected live-score's points figure after question ${q} to equal (correct-so-far ${correctSoFar}) x 10 = ` +
          `${correctSoFar * 10}, got ${points}. AC34: every correct answer must contribute exactly 10 points, ` +
          'every wrong/unanswered question 0, with no speed-based variation.',
      ).toBe(correctSoFar * 10);

      if (q < questionsToSample) {
        await goToNextQuestion(page);
      }
    }
  });

  test('round summary shows points-out-of-max matching the observed correct count x 10 and question count x 10 (AC36)', async ({
    page,
  }) => {
    await startBatch(page);
    const round1 = await runExtraLetterRound(page);

    const pointsFraction = await findPointsFraction(page);
    expect(
      pointsFraction.maxPoints,
      `expected the Round summary's points max to equal Round 1's real observed question count (${round1.totalQuestions}) ` +
        `x 10 = ${round1.totalQuestions * 10} (AC36: never a hardcoded IOE-specific number), got ${pointsFraction.maxPoints}`,
    ).toBe(round1.totalQuestions * 10);
    expect(
      pointsFraction.points,
      `expected the Round summary's points figure to equal Round 1's real observed correct count (${round1.correctCount}) ` +
        `x 10 = ${round1.correctCount * 10}, got ${pointsFraction.points}`,
    ).toBe(round1.correctCount * 10);
  });

  test('batch summary headline points figure equals the sum of every real per-round points figure observed (AC36)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Round 3 is not under test here -- forced through its
      // speech-recognition-unsupported fallback path deterministically,
      // same rationale as batch-full-flow.spec.ts.
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);
    await runDescribeAndChooseImageRound(page);
    await goToNextRound(page);

    await expect(page.getByTestId('batch-score-summary')).toBeVisible();

    // Ground truth: sum every round-breakdown-{n}'s own "X/Y điểm" figure
    // (plan.md v10: "extend the per-round breakdown list to also show each
    // round's points"). round-breakdown-{n} is a pre-existing, spec-stable
    // testid (plan.md v5/v6), not one of v10's uncertain new elements, so
    // scoping the text-pattern search to it is safe and precise.
    let summedPoints = 0;
    let summedMaxPoints = 0;
    for (const roundNumber of [1, 2, 3, 4] as const) {
      const breakdown = page.getByTestId(`round-breakdown-${roundNumber}`);
      await expect(breakdown, `expected round-breakdown-${roundNumber} to be visible on the Batch summary`).toBeVisible();
      const roundPoints = await findPointsFraction(page, breakdown);
      summedPoints += roundPoints.points;
      summedMaxPoints += roundPoints.maxPoints;
    }

    const headline = await findPointsFraction(page);
    expect(
      headline.points,
      `expected the Batch summary's headline points figure (${headline.points}) to equal the sum of every real ` +
        `per-round points figure observed on the same screen (${summedPoints})`,
    ).toBe(summedPoints);
    expect(
      headline.maxPoints,
      `expected the Batch summary's headline max-points figure (${headline.maxPoints}) to equal the sum of every ` +
        `real per-round max-points figure observed on the same screen (${summedMaxPoints})`,
    ).toBe(summedMaxPoints);
  });

  test('Round 4 picture-pair-matching boards contribute honest points, each board counting as exactly one question (AC34, AC36, no-regression check)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);

    // runDescribeAndChooseImageRound already treats a picture-pair-matching
    // board as exactly ONE "question" toward totalQuestions/correctCount
    // (plan.md v8: "This whole board counts as ONE question in Round 4's
    // ~10-question sequence") -- reused here rather than re-implementing
    // that counting logic, per this task's instructions.
    const round4 = await runDescribeAndChooseImageRound(page);

    const pointsFraction = await findPointsFraction(page);
    expect(
      pointsFraction.maxPoints,
      `expected Round 4's points max to equal its real observed question count (${round4.totalQuestions}, which ` +
        'already counts each picture-pair-matching board as one question) x 10, got ' +
        `${pointsFraction.maxPoints} (expected ${round4.totalQuestions * 10})`,
    ).toBe(round4.totalQuestions * 10);
    expect(
      pointsFraction.points,
      `expected Round 4's points figure to equal its real observed correct count (${round4.correctCount}) x 10, ` +
        `got ${pointsFraction.points} (expected ${round4.correctCount * 10})`,
    ).toBe(round4.correctCount * 10);
  });
});
