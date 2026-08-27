import { test, expect } from '@playwright/test';
import {
  ALL_QUESTION_KINDS,
  MIN_TOPIC_COUNT,
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
 * Covers plan.md AC1 and AC11: grade to topic navigation and back. v3 grows
 * the topic list from 2 to roughly 10-15 (engineer's final count), so this
 * only asserts "at least MIN_TOPIC_COUNT distinct topics" per AC11 -- it
 * never hardcodes an exact topic count.
 */
test.describe('Student self-practice: grade to topic navigation', () => {
  test('shows exactly 1 grade card, selecting it shows at least 10 distinct topic cards (AC11), Back returns to grade selection', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(gradeCards(page), 'exactly 1 grade card ("Lop 2") per plan.md AC1').toHaveCount(1);

    await selectGrade(page, 0);

    const topicIds = await readTopicTestIds(page);
    expect(
      topicIds.length,
      `AC11 requires at least ${MIN_TOPIC_COUNT} distinct topics; never hardcode an exact count`,
    ).toBeGreaterThanOrEqual(MIN_TOPIC_COUNT);
    expect(new Set(topicIds).size, 'topic testids must be distinct, no duplicate topics (AC11)').toBe(
      topicIds.length,
    );
    await expect(gradeCards(page)).toHaveCount(0);

    await goBackToGrades(page);

    await expect(gradeCards(page)).toHaveCount(1);
    await expect(topicCards(page)).toHaveCount(0);
  });
});

/**
 * Covers plan.md AC9: "Choose another topic" from the result summary returns
 * to the topic list (with the full, unchanged topic catalog), not the grade
 * selection screen.
 */
test.describe('Student self-practice: choose another topic', () => {
  test('returns to the same topic list after finishing a session', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page, 0);

    const topicIdsBeforeSession = await readTopicTestIds(page);
    expect(topicIdsBeforeSession.length).toBeGreaterThanOrEqual(MIN_TOPIC_COUNT);

    await selectTopic(page, 0);

    const { total: totalQuestions } = await readQuestionProgress(page);

    for (let q = 1; q <= totalQuestions; q++) {
      // Discover-and-answer with a guaranteed-safe first attempt; the actual
      // outcome does not matter for this navigation scenario, only that the
      // session can be completed by branching correctly on question kind
      // (now any of the 4 v3 kinds, not just the original 2).
      const kind = await currentQuestionKind(page);
      expect(ALL_QUESTION_KINDS).toContain(kind);
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

/**
 * Test Strategy Addition (plan.md v3): "one navigation-through-many-topics
 * smoke check given the larger topic count." Samples the first, middle and
 * last topic in the catalog (rather than running a full session through
 * every topic, which is already exercised in depth by other specs) and
 * verifies each one starts a valid, recognized first question.
 */
test.describe('Student self-practice: many-topic navigation smoke check', () => {
  test('a sample of topics across the larger catalog each start a valid first question', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    const topicCount = await topicCards(page).count();
    expect(topicCount).toBeGreaterThanOrEqual(MIN_TOPIC_COUNT);

    const sampleIndexes = Array.from(new Set([0, Math.floor(topicCount / 2), topicCount - 1]));

    for (const topicIndex of sampleIndexes) {
      await test.step(`topic index ${topicIndex} starts a valid first question`, async () => {
        await page.goto('/');
        await selectGrade(page, 0);
        await selectTopic(page, topicIndex);

        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(1);
        expect(progress.total).toBeGreaterThan(0);

        const kind = await currentQuestionKind(page);
        expect(ALL_QUESTION_KINDS).toContain(kind);
      });
    }
  });
});
