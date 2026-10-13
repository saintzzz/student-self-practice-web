import { test, expect } from '@playwright/test';
import { startBatch } from './utils/batch-flow';
import { currentQuestionKindOneOf } from './utils/practice-flow';

/**
 * CR-69: the destructive KẾT THÚC control used to end the whole Batch on
 * a single mis-tap - and a batch ended with zero answered questions still
 * paid chest stars / streak / sticker awards. Now the button opens a
 * centered confirmation dialog, and a 0-question batch lands on the
 * reward-free empty state.
 */
test.describe('Batch: end-early confirmation (CR-69)', () => {
  test('KẾT THÚC asks first; "Chơi tiếp" cancels back to the active Round', async ({ page }) => {
    await startBatch(page);
    await currentQuestionKindOneOf(page, ['extra-letter', 'image-choice']);

    await page.getByTestId('batch-end-early').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByTestId('end-confirm-cancel').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // Back in the active Round - question card still on screen.
    await expect(page.getByTestId('question-card')).toBeVisible();
  });

  test('confirming KẾT THÚC with zero answered questions shows the reward-free summary', async ({ page }) => {
    await startBatch(page);
    await currentQuestionKindOneOf(page, ['extra-letter', 'image-choice']);

    await page.getByTestId('batch-end-early').click();
    await page.getByTestId('end-confirm-ok').click();

    // 0-question batch: empty-state note, no score pill, no per-round list.
    await expect(page.getByTestId('batch-empty-note')).toBeVisible();
    await expect(page.getByTestId('batch-score-summary')).not.toBeVisible();
    await expect(page.getByTestId('practice-again-button')).toBeVisible();
    await expect(page.getByTestId('back-to-grades')).toBeVisible();
  });
});
