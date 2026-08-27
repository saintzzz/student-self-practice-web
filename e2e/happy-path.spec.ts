import { test, expect } from '@playwright/test';
import {
  gradeCards,
  topicCards,
  optionButtons,
  incorrectItems,
  selectGrade,
  selectTopic,
  readQuestionProgress,
  readScoreSummary,
  answerAndDiscoverCorrectIndex,
  goToNextQuestion,
  clickPracticeAgain,
} from './utils/practice-flow';

/**
 * Covers plan.md AC1, AC3, AC4, AC5, AC6, AC7: grade -> topic -> full
 * practice session -> full score result -> Practice Again reset.
 *
 * The correct answer for each question is never hardcoded. Instead a
 * discovery pass plays through the session once and reads which option is
 * marked "correct" after each answer (guaranteed by AC4: the correct answer
 * is always revealed after a selection). A second, verified pass then
 * answers every question with the discovered correct index to guarantee a
 * full score, without depending on question wording or the underlying
 * answer key.
 */
test.describe('Student self-practice: happy path', () => {
  test('answers every question correctly and Practice Again resets to question 1', async ({
    page,
  }) => {
    await page.goto('/');

    await test.step('grade selection shows at least 2 grade cards (AC1)', async () => {
      const gradeCount = await gradeCards(page).count();
      expect(gradeCount).toBeGreaterThanOrEqual(2);
    });

    await selectGrade(page, 0);

    await test.step('topic selection shows at least 2 topic cards for the grade (AC2)', async () => {
      const topicCount = await topicCards(page).count();
      expect(topicCount).toBeGreaterThanOrEqual(2);
    });

    await selectTopic(page, 0);

    const firstProgress = await readQuestionProgress(page);
    expect(firstProgress.current).toBe(1);
    expect(await optionButtons(page).count()).toBe(4);
    const totalQuestions = firstProgress.total;

    const correctIndices: number[] = [];

    await test.step('discovery pass: record the correct index for every question', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(q);

        const { correctIndex } = await answerAndDiscoverCorrectIndex(page, 0);
        correctIndices.push(correctIndex);

        await goToNextQuestion(page);
      }
      await expect(page.getByTestId('score-summary')).toBeVisible();
    });

    await test.step('Practice Again resets the session to question 1 (AC7)', async () => {
      await clickPracticeAgain(page);
      const resetProgress = await readQuestionProgress(page);
      expect(resetProgress.current).toBe(1);
      expect(resetProgress.total).toBe(totalQuestions);
    });

    await test.step('verified pass: answer every question with the discovered correct index', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(q);

        const options = optionButtons(page);
        const correctIndex = correctIndices[q - 1];
        await options.nth(correctIndex).click();
        await expect(options.first()).toBeDisabled();

        await goToNextQuestion(page);
      }
    });

    await test.step('result summary shows a full score with no incorrect answers (AC6)', async () => {
      const summary = await readScoreSummary(page);
      expect(summary.total).toBe(totalQuestions);
      expect(summary.correct).toBe(totalQuestions);
      expect(await incorrectItems(page).count()).toBe(0);
    });

    await test.step('Practice Again resets the now-perfect session back to question 1 (AC7)', async () => {
      await clickPracticeAgain(page);
      const finalReset = await readQuestionProgress(page);
      expect(finalReset.current).toBe(1);
      expect(finalReset.total).toBe(totalQuestions);
      expect(await optionButtons(page).count()).toBe(4);
    });
  });
});
