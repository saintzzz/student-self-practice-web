import { test, expect } from '@playwright/test';
import {
  gradeCards,
  topicCards,
  selectGrade,
  selectTopic,
  goBackToGrades,
  readTopicTestIds,
  readQuestionProgress,
  currentQuestionKind,
  discoverCurrentQuestionAnswer,
  goToNextQuestion,
  clickChooseAnotherTopic,
} from './utils/practice-flow';

/**
 * Covers plan.md AC1, AC2: grade to topic navigation and back.
 */
test.describe('Student self-practice: grade to topic navigation', () => {
  test('shows exactly 1 grade card, selecting it shows 2 topic cards, Back returns to grade selection', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(gradeCards(page), 'exactly 1 grade card ("Lop 2") per plan.md AC1').toHaveCount(1);

    await selectGrade(page, 0);

    await expect(topicCards(page), '2 topic cards ("Con vat", "Mau sac") per plan.md AC2').toHaveCount(2);
    await expect(gradeCards(page)).toHaveCount(0);

    await goBackToGrades(page);

    await expect(gradeCards(page)).toHaveCount(1);
    await expect(topicCards(page)).toHaveCount(0);
  });
});

/**
 * Covers plan.md AC9: "Choose another topic" from the result summary returns
 * to the topic list, not the grade selection screen.
 */
test.describe('Student self-practice: choose another topic', () => {
  test('returns to the same topic list after finishing a session', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page, 0);

    const topicIdsBeforeSession = await readTopicTestIds(page);
    expect(topicIdsBeforeSession.length).toBe(2);

    await selectTopic(page, 0);

    const { total: totalQuestions } = await readQuestionProgress(page);

    for (let q = 1; q <= totalQuestions; q++) {
      // Discover-and-answer with a guaranteed-safe first attempt; the actual
      // outcome does not matter for this navigation scenario, only that the
      // session can be completed by branching correctly on question kind.
      const kind = await currentQuestionKind(page);
      expect(['image-choice', 'listening-fill-blank']).toContain(kind);
      await discoverCurrentQuestionAnswer(page);
      await goToNextQuestion(page);
    }

    await expect(page.getByTestId('score-summary')).toBeVisible();

    await clickChooseAnotherTopic(page);

    await expect(gradeCards(page)).toHaveCount(0);
    const topicIdsAfterChoose = await readTopicTestIds(page);
    expect(topicIdsAfterChoose).toEqual(topicIdsBeforeSession);
  });
});
