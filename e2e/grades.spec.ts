import { expect, test } from '@playwright/test';
import {
  answerExtraLetterTile,
  extractRevealedWord,
  gradeCards,
  questionCard,
  readQuestionProgress,
} from './utils/practice-flow';
import { gotoApp } from './utils/auth-flow';

/**
 * CR-07 AC-G1/AC-G4/AC-G6: every grade card opens a Batch whose Round 1
 * renders real content from that grade's vocabulary pool. The unit-level
 * grades.test.ts proves pool scoping and no-leakage across all 4 rounds;
 * this spec proves the UI wiring end to end per grade card.
 */

const GRADE_IDS = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'] as const;

test.describe('Grade selection -> per-grade Batch (CR-07)', () => {
  test('all five grade cards are visible on the grade screen', async ({ page }) => {
    await gotoApp(page);
    await expect(gradeCards(page)).toHaveCount(5);
    for (const id of GRADE_IDS) {
      await expect(page.getByTestId(`grade-card-${id}`)).toBeVisible();
    }
  });

  for (const gradeId of GRADE_IDS) {
    test(`${gradeId}: card -> start batch -> real Round 1 question with revealed answer`, async ({
      page,
    }) => {
      await gotoApp(page);
      await page.getByTestId(`grade-card-${gradeId}`).click();
      await page.getByTestId('start-batch-button').click();

      // Round 1 must show a real question card with a progress counter.
      await expect(questionCard(page)).toBeVisible();
      const progress = await readQuestionProgress(page);
      expect(progress.total).toBeGreaterThan(0);

      // Answer the first question. For extra-letter kinds we discover the
      // correct tile from the app's own revealed feedback; for image-choice
      // kinds (mixed into Round 1) we click an option and read feedback the
      // same way - both prove real generated content, never stubs.
      const kind = await questionCard(page).getAttribute('data-question-kind');
      let revealed: string;
      if (kind === 'extra-letter') {
        const result = await answerExtraLetterTile(page, 0);
        revealed = result.correctWord;
      } else {
        const options = page.locator('[data-testid^="image-option-"], [data-testid^="option-"]');
        await options.first().click();
        // image-choice feedback carries no answer-feedback testid
        // (FeedbackPanel only sets it for the three typed/tile kinds), so
        // read the shared "Từ đúng là:" reveal line inside the card.
        const revealLine = questionCard(page).getByText('Từ đúng là:');
        await expect(revealLine).toBeVisible();
        revealed = extractRevealedWord((await revealLine.innerText()).trim());
      }
      expect(revealed.length).toBeGreaterThanOrEqual(2);

      // Back out cleanly - the grade screen must restore for the next grade.
      await gotoApp(page);
      await expect(gradeCards(page)).toHaveCount(5);
    });
  }
});
