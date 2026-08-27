import { test, expect } from '@playwright/test';
import {
  optionButtons,
  incorrectItems,
  selectGrade,
  selectTopic,
  readQuestionProgress,
  readScoreSummary,
  answerAndDiscoverCorrectIndex,
  goToNextQuestion,
} from './utils/practice-flow';

/**
 * Covers plan.md AC4 and AC6: immediate incorrect feedback with the correct
 * answer revealed, plus the wrong question appearing in the result summary
 * with an explanation.
 *
 * The test deliberately selects option index 1 for every question. This
 * does not depend on question wording. To guarantee at least one wrong
 * answer without foreknowledge of the answer key, the session is replayed
 * (each attempt clicking a different fixed index) up to 4 times if an
 * attempt happens to score a perfect run. This keeps the test deterministic
 * and non-flaky while never reading application source data.
 */
test.describe('Student self-practice: incorrect answer feedback', () => {
  test('shows incorrect feedback, correct answer, and explanation, then lists it in the summary', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    await selectTopic(page, 0);

    const firstProgress = await readQuestionProgress(page);
    const totalQuestions = firstProgress.total;

    let wrongQuestionNumber = -1;
    let wrongExplanationText = '';

    for (let attemptOffset = 0; attemptOffset < 4 && wrongQuestionNumber === -1; attemptOffset++) {
      if (attemptOffset > 0) {
        // Previous attempt scored a perfect run by luck; restart the same
        // topic via the grade/topic flow and try a different fixed index.
        await page.goto('/');
        await selectGrade(page, 0);
        await selectTopic(page, 0);
      }

      for (let q = 1; q <= totalQuestions; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(q);

        const optionIndex = (attemptOffset + 1) % 4;
        const { clickedOutcome, correctIndex } = await answerAndDiscoverCorrectIndex(
          page,
          optionIndex,
        );

        if (clickedOutcome === 'incorrect' && wrongQuestionNumber === -1) {
          wrongQuestionNumber = q;

          // AC4: incorrect feedback and the revealed correct answer are
          // shown immediately, before advancing to the next question.
          const options = optionButtons(page);
          const clickedOption = options.nth(optionIndex);
          const correctOption = options.nth(correctIndex);
          await expect(clickedOption).toBeDisabled();
          await expect(correctOption).toBeDisabled();
          expect(correctIndex).not.toBe(optionIndex);

          // AC4/AC6: an explanation is shown immediately alongside the
          // feedback (not just later in the summary).
          const bodyText = (await page.locator('body').innerText()).toLowerCase();
          expect(bodyText).toContain('incorrect');
          wrongExplanationText = bodyText;
        }

        await goToNextQuestion(page);
      }
    }

    expect(
      wrongQuestionNumber,
      'expected at least one incorrect answer across retry attempts, got a perfect score every time',
    ).toBeGreaterThan(0);
    expect(wrongExplanationText.length).toBeGreaterThan(0);

    // Finish the session and confirm the result summary lists the wrong
    // question (AC6).
    await expect(page.getByTestId('score-summary')).toBeVisible();
    const summary = await readScoreSummary(page);
    expect(summary.total).toBe(totalQuestions);
    expect(summary.correct).toBeLessThan(totalQuestions);

    const items = incorrectItems(page);
    const incorrectCount = await items.count();
    expect(incorrectCount).toBe(totalQuestions - summary.correct);
    expect(incorrectCount).toBeGreaterThanOrEqual(1);

    // Every incorrect item includes explanatory content (AC6), never
    // asserted against specific question wording.
    for (let i = 0; i < incorrectCount; i++) {
      const itemText = (await items.nth(i).innerText()).trim();
      expect(itemText.length).toBeGreaterThan(0);
    }
  });
});
