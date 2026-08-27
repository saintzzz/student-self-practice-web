import { test, expect } from '@playwright/test';
import {
  gradeCards,
  topicCards,
  selectGrade,
  selectTopic,
  goBackToGrades,
  readTopicTestIds,
  readQuestionProgress,
  goToNextQuestion,
  answerAndDiscoverCorrectIndex,
  clickChooseAnotherTopic,
} from './utils/practice-flow';

/**
 * Covers plan.md AC2 (Back to grade selection) and AC8 (Choose another
 * topic returns to the topic list for the current grade).
 */
test.describe('Student self-practice: navigation', () => {
  test('Back on topic selection returns to grade selection', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page, 0);

    const topicCountBefore = await topicCards(page).count();
    expect(topicCountBefore).toBeGreaterThanOrEqual(2);
    await expect(gradeCards(page)).toHaveCount(0);

    await goBackToGrades(page);

    const gradeCountAfter = await gradeCards(page).count();
    expect(gradeCountAfter).toBeGreaterThanOrEqual(2);
    await expect(topicCards(page)).toHaveCount(0);
  });

  test('Choose another topic from the result summary returns to the same grade topic list', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page, 0);

    const topicIdsBeforeSession = await readTopicTestIds(page);
    expect(topicIdsBeforeSession.length).toBeGreaterThanOrEqual(2);

    await selectTopic(page, 0);

    const { total: totalQuestions } = await readQuestionProgress(page);
    for (let q = 1; q <= totalQuestions; q++) {
      // Answer arbitrarily; the outcome does not matter for this navigation
      // scenario, only that a session can be completed.
      await answerAndDiscoverCorrectIndex(page, 0);
      await goToNextQuestion(page);
    }

    await expect(page.getByTestId('score-summary')).toBeVisible();

    await clickChooseAnotherTopic(page);

    // Same topic list as before (AC8), not a different grade or the grade
    // selection screen.
    await expect(gradeCards(page)).toHaveCount(0);
    const topicIdsAfterChoose = await readTopicTestIds(page);
    expect(topicIdsAfterChoose).toEqual(topicIdsBeforeSession);
  });
});
