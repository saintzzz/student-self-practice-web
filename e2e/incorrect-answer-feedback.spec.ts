import { test, expect } from '@playwright/test';
import {
  incorrectItems,
  questionCard,
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
 * Covers plan.md AC4, AC5, AC7: immediate incorrect feedback with the
 * correct answer revealed and an explanation shown, for BOTH question
 * kinds, plus both wrong questions appearing in the result summary.
 *
 * A discovery pass first records the correct answer key for every question
 * (never hardcoded, see practice-flow.ts). The session is then restarted
 * with Practice Again and replayed: the first image-choice question and the
 * first listening-fill-blank question encountered are each deliberately
 * answered wrong (by picking a different option index, or typing a guess
 * that deviates from the discovered word), and every other question is
 * answered correctly using the same discovered key. AC3 guarantees at least
 * one question of each kind exists in every session, so both forced-wrong
 * attempts are always possible.
 */
test.describe('Student self-practice: incorrect answer feedback for both kinds', () => {
  test('shows immediate incorrect feedback, revealed correct word, and explanation for both kinds, then lists both as incorrect in the summary', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    await selectTopic(page, 0);

    const { total: totalQuestions } = await readQuestionProgress(page);

    const answerKeys: QuestionAnswerKey[] = [];

    await test.step('discovery pass: record the correct answer key for every question', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const key = await discoverCurrentQuestionAnswer(page);
        answerKeys.push(key);
        await goToNextQuestion(page);
      }
      await expect(page.getByTestId('score-summary')).toBeVisible();
    });

    expect(
      answerKeys.some((key) => key.kind === 'image-choice'),
      'expected at least one image-choice question per AC3',
    ).toBe(true);
    expect(
      answerKeys.some((key) => key.kind === 'listening-fill-blank'),
      'expected at least one listening-fill-blank question per AC3',
    ).toBe(true);

    await test.step('restart the same topic for the forced-wrong-answer pass', async () => {
      await clickPracticeAgain(page);
      const resetProgress = await readQuestionProgress(page);
      expect(resetProgress.current).toBe(1);
    });

    let wrongImageChoiceQuestion = -1;
    let wrongListeningQuestion = -1;
    let tallyOfCorrectAnswers = 0;

    await test.step('answer pass: force one wrong answer for each kind, answer the rest correctly', async () => {
      for (let q = 1; q <= totalQuestions; q++) {
        const key = answerKeys[q - 1];
        const forceWrong =
          (key.kind === 'image-choice' && wrongImageChoiceQuestion === -1) ||
          (key.kind === 'listening-fill-blank' && wrongListeningQuestion === -1);

        const beforeText =
          forceWrong && key.kind === 'image-choice' ? (await questionCard(page).innerText()).trim() : '';

        const result = await answerCurrentQuestionWithKey(page, key, forceWrong ? 'incorrect' : 'correct');

        if (forceWrong) {
          expect(result.outcome, `expected question ${q} (${key.kind}) to be marked incorrect`).toBe('incorrect');

          if (key.kind === 'image-choice') {
            wrongImageChoiceQuestion = q;
            // AC4: the correct answer and an explanation are revealed
            // immediately, on top of whatever the question already showed.
            expect(result.feedbackText.length, 'expected additional revealed/explanation content after answering').toBeGreaterThan(
              beforeText.length + 5,
            );
          } else {
            wrongListeningQuestion = q;
            // AC5: answer-feedback shows the correct word plus an
            // explanation, not just the bare word.
            expect(result.feedbackText.toLowerCase()).toContain(result.revealedWord.toLowerCase());
            expect(result.feedbackText.length).toBeGreaterThan(result.revealedWord.length + 5);
          }
        } else {
          expect(result.outcome, `expected question ${q} (${key.kind}) to be marked correct`).toBe('correct');
          tallyOfCorrectAnswers++;
        }

        await goToNextQuestion(page);
      }
    });

    expect(
      wrongImageChoiceQuestion,
      'no image-choice question in this session, could not force a wrong image-choice answer',
    ).toBeGreaterThan(0);
    expect(
      wrongListeningQuestion,
      'no listening-fill-blank question in this session, could not force a wrong listening answer',
    ).toBeGreaterThan(0);

    await test.step('result summary lists both forced-wrong questions as incorrect (AC7)', async () => {
      const summary = await readScoreSummary(page);
      expect(summary.total).toBe(totalQuestions);
      expect(summary.correct).toBe(tallyOfCorrectAnswers);

      const items = incorrectItems(page);
      const incorrectCount = await items.count();
      expect(incorrectCount).toBe(totalQuestions - tallyOfCorrectAnswers);
      expect(incorrectCount).toBe(2);

      // Every incorrect item includes explanatory content (AC7), never
      // asserted against specific question wording.
      for (let i = 0; i < incorrectCount; i++) {
        const itemText = (await items.nth(i).innerText()).trim();
        expect(itemText.length).toBeGreaterThan(0);
      }
    });
  });
});
