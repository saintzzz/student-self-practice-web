import { test, expect } from '@playwright/test';
import {
  gradeCards,
  topicCards,
  incorrectItems,
  selectGrade,
  selectTopic,
  readQuestionProgress,
  readScoreSummary,
  discoverCurrentQuestionAnswer,
  answerCurrentQuestionWithKey,
  goToNextQuestion,
  clickPracticeAgain,
  type QuestionAnswerKey,
} from './utils/practice-flow';

/**
 * Covers plan.md AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8: grade to topic to a
 * full 6-question practice session mixing both question kinds, to a full
 * score result, to a Practice Again reset.
 *
 * The correct answer for each question is never hardcoded. A discovery pass
 * plays through the session once: for image-choice it clicks option 0 and
 * scans every option for the "correct" feedback signal revealed after any
 * selection (AC4); for listening-fill-blank it submits a guaranteed-wrong
 * digits-only guess and reads the correct word out of answer-feedback, which
 * always reveals the correct word regardless of outcome (AC5, contract v2).
 * A second, verified pass then answers every question using the discovered
 * key to guarantee a full score, and the resulting score is checked against
 * a tally built purely from the outcomes observed during that verified
 * pass, never against a hardcoded question count value.
 */
test.describe('Student self-practice: happy path across both question kinds', () => {
  test('answers every question correctly across image-choice and listening-fill-blank, then Practice Again resets to question 1', async ({
    page,
  }) => {
    await page.goto('/');

    await test.step('grade selection shows exactly 1 grade card (AC1)', async () => {
      await expect(gradeCards(page)).toHaveCount(1);
    });

    await selectGrade(page, 0);

    await test.step('topic selection shows 2 topic cards (AC2)', async () => {
      await expect(topicCards(page)).toHaveCount(2);
    });

    await selectTopic(page, 0);

    const firstProgress = await readQuestionProgress(page);
    expect(firstProgress.current).toBe(1);
    expect(firstProgress.total).toBe(6);
    const totalQuestions = firstProgress.total;

    const answerKeys: QuestionAnswerKey[] = [];

    await test.step('discovery pass: record the correct answer key for every question', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(q);

        const key = await discoverCurrentQuestionAnswer(page);
        answerKeys.push(key);

        await goToNextQuestion(page);
      }
      await expect(page.getByTestId('score-summary')).toBeVisible();
    });

    await test.step('the session mixed both question kinds (AC3)', async () => {
      expect(answerKeys.some((key) => key.kind === 'image-choice')).toBe(true);
      expect(answerKeys.some((key) => key.kind === 'listening-fill-blank')).toBe(true);
    });

    await test.step('Practice Again resets the session to question 1 (AC8)', async () => {
      await clickPracticeAgain(page);
      const resetProgress = await readQuestionProgress(page);
      expect(resetProgress.current).toBe(1);
      expect(resetProgress.total).toBe(totalQuestions);
    });

    let tallyOfCorrectAnswers = 0;

    await test.step('verified pass: answer every question with the discovered correct key (AC4, AC5)', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current).toBe(q);

        const result = await answerCurrentQuestionWithKey(page, answerKeys[q - 1], 'correct');
        expect(result.outcome, `question ${q} (${answerKeys[q - 1].kind}) expected to be marked correct`).toBe(
          'correct',
        );
        tallyOfCorrectAnswers++;

        await goToNextQuestion(page);
      }
    });

    await test.step('result summary score matches the tally of correct answers actually given (AC6, AC7)', async () => {
      const summary = await readScoreSummary(page);
      expect(summary.total).toBe(totalQuestions);
      expect(summary.correct).toBe(tallyOfCorrectAnswers);
      expect(await incorrectItems(page).count()).toBe(totalQuestions - tallyOfCorrectAnswers);
      expect(await incorrectItems(page).count()).toBe(0);
    });
  });
});
