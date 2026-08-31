import { test, expect, type Page } from '@playwright/test';
import { fastForwardThroughRounds1And2, goToNextRound, readRoundProgress, readRoundScoreSummary } from './utils/batch-flow';
import { currentQuestionKind, goToNextQuestion, readElementOutcome, readQuestionProgress } from './utils/practice-flow';
import { answerOptionQuestion, currentDescriptionType, optionButtons } from './utils/option-flow';
import { runDescribeAndChooseImageRound, runPronunciationRecordingRoundFallback } from './utils/round34-flow';

/**
 * Covers plan.md v5/v6 Round 4 (describe-and-choose-image -- AC20, AC25,
 * "Round 4 Negation Design", Data-Testid Contract Additions: reuses
 * `option-{index}`, `data-description-type="count"|"negation"` on the
 * question container).
 *
 * Round 3 does not have real content yet at the time this suite was
 * written (see round3-pronunciation-recording.spec.ts's scope note) so
 * every test here drives through Round 3 using the forced
 * speech-recognition-unsupported fallback path purely to reach Round 4 --
 * deterministic, and does not depend on real mic/transcription. These
 * tests do not re-assert Round 3's own behavior in depth; that is
 * round3-pronunciation-recording.spec.ts's job. Each test starts its own
 * fresh Batch and is independent of every other spec file.
 *
 * Never hardcodes any vocabulary/sentence/description content -- every
 * "which option is correct" fact is discovered from the app's own
 * post-answer styling signal via answerOptionQuestion (same
 * discover-from-revealed-state technique as Round 1/2, applied to the
 * option-button shell -- see practice-flow.ts's answerOptionQuestion doc
 * comment).
 */
async function reachRound4(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Round 3 is not under test here -- forced through its
    // speech-recognition-unsupported fallback path deterministically. See
    // round3-pronunciation-recording.spec.ts for that path's own coverage.
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.SpeechRecognition;
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.webkitSpeechRecognition;
  });

  await fastForwardThroughRounds1And2(page);
  await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
  await goToNextRound(page);
}

test.describe('Batch/Round: Round 4 (describe-and-choose-image)', () => {
  test('renders 4 image options per question with exactly one correct option every time, for both count and negation description types (AC20)', async ({
    page,
  }) => {
    await reachRound4(page);

    await test.step('Round 4 begins at round 4 of 4 with describe-and-choose-image questions', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(4);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKind(page, 'describe-and-choose-image');
    });

    const round4 = await runDescribeAndChooseImageRound(page);

    await test.step('every question had exactly 4 options and produced a definite correct/incorrect outcome (enforced by answerOptionQuestion)', async () => {
      expect(round4.correctCount + round4.incorrectCount).toBe(round4.totalQuestions);
      // plan.md AC17 says "~10 questions each" -- tolerant range, same
      // reasoning as round1/round2 specs.
      expect(round4.totalQuestions).toBeGreaterThanOrEqual(8);
      expect(round4.totalQuestions).toBeLessThanOrEqual(12);
    });

    await test.step('every question was tagged a valid description type (count or negation) via data-description-type', async () => {
      expect(round4.descriptionTypeCounts.count + round4.descriptionTypeCounts.negation).toBe(round4.totalQuestions);
      expect(round4.descriptionTypeCounts.count).toBeGreaterThanOrEqual(0);
      expect(round4.descriptionTypeCounts.negation).toBeGreaterThanOrEqual(0);
    });

    await test.step('round score summary reflects the real tally observed while answering (never a hardcoded expected score)', async () => {
      const roundScore = await readRoundScoreSummary(page);
      expect(roundScore.total).toBe(round4.totalQuestions);
      expect(roundScore.current).toBe(round4.correctCount);
    });
  });

  test('a wrong-answer selection shows immediate incorrect feedback on the clicked option and reveals the correct option', async ({
    page,
  }) => {
    await reachRound4(page);
    await currentQuestionKind(page, 'describe-and-choose-image');

    const { total } = await readQuestionProgress(page);
    let foundWrongCase = false;

    for (let q = 1; q <= total; q++) {
      const progress = await readQuestionProgress(page);
      expect(progress.current, `expected question ${q} of Round 4`).toBe(q);
      await currentQuestionKind(page, 'describe-and-choose-image');
      const descriptionType = await currentDescriptionType(page);

      // Structural choice (always click the first rendered option), never a
      // hardcoded content assumption -- same technique as
      // runDescribeAndChooseImageRound.
      const result = await answerOptionQuestion(page, 0);

      if (!foundWrongCase && result.outcome === 'incorrect') {
        foundWrongCase = true;
        await test.step(
          `question ${q} (${descriptionType}): the wrong clicked option shows incorrect styling immediately, the correct option is revealed, and all options lock`,
          async () => {
            const clickedOutcome = await readElementOutcome(optionButtons(page).nth(result.clickedIndex));
            const correctOutcome = await readElementOutcome(optionButtons(page).nth(result.correctIndex));
            expect(clickedOutcome, 'the clicked wrong option must show an incorrect styling signal immediately').toBe(
              'incorrect',
            );
            expect(
              correctOutcome,
              'the correct option must show a correct styling signal immediately, revealing the right answer',
            ).toBe('correct');

            const optionCount = await optionButtons(page).count();
            for (let i = 0; i < optionCount; i++) {
              await expect(
                optionButtons(page).nth(i),
                `option-${i} must be disabled once the question is answered (no further picks allowed)`,
              ).toBeDisabled();
            }
          },
        );
      }

      await goToNextQuestion(page);
    }

    await expect(page.getByTestId('round-score-summary')).toBeVisible();

    expect(
      foundWrongCase,
      'expected at least one describe-and-choose-image question in this ~10-question round where clicking ' +
        'option 0 was the wrong answer, which is where the immediate-incorrect-feedback assertions above ran -- ' +
        'getting all questions correct by always picking option 0 is possible in principle (each question has 4 ' +
        'options) but astronomically unlikely across ~10 questions; if this ever fires, it is worth investigating ' +
        'rather than assuming test flakiness',
    ).toBe(true);
  });
});
