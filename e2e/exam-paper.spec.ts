import { test, expect } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';
import { selectGrade } from './utils/practice-flow';
import { mascotLocator } from './utils/mascot-flow';

/**
 * CR-82 M5 (spec s10): the exam hall is a dark desk + paper sheet - no
 * mascot during the sitting (R-v5-06), flags + navigator + review sheet
 * (D-13/D-18), formal verdicts, paper ExamResult certificate.
 * Driven through the real hub flow like every other spec in this suite.
 */

test.describe('Exam paper register (CR-82 M5)', () => {
  test('timed sitting: paper sheet, zero mascot, flag + navigator + review-before-submit flow', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2); // grade-3

    await page.getByTestId('hub-tile-learn').click();
    await page.getByTestId('exam-program-english').click();
    // ExamIntro: paper card, the ONE mascot of this screen, gold begin.
    await expect(mascotLocator(page)).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();

    const examScreen = page.getByTestId('exam-screen');
    await expect(examScreen).toBeVisible({ timeout: 15_000 });

    // R-v5-06: no mascot inside the exam hall.
    await expect(page.locator('[data-mascot-mood]')).toHaveCount(0);
    // Desk chrome: progress ring + timer, paper sheet, navy question chip.
    await expect(page.getByTestId('exam-progress-ring')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('exam-timer')).toBeVisible();
    const sheet = examScreen.locator('main');
    await expect(sheet).toHaveClass(/bg-slate-50/);

    // D-18: flag the current question via the F shortcut. The exam seed
    // is per-run, so question 0 can be a free-text kind whose input
    // autofocuses - the shortcut is correctly inert while typing, so
    // park focus on the desk chrome (non-interactive ring) first.
    await page.getByTestId('exam-progress-ring').click();
    await page.keyboard.press('f');
    await expect(page.getByTestId('exam-flag')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('exam-nav-0')).toContainText('đã đánh dấu');

    // D-18: N opens the navigator; a cell jump closes it.
    await page.keyboard.press('n');
    await expect(page.getByTestId('exam-navigator')).toBeVisible();
    await page.getByTestId('exam-navigator-cell-0').click();
    await expect(page.getByTestId('exam-navigator')).not.toBeVisible();

    // D-13: NỘP BÀI opens the review sheet, never the generic confirm.
    await page.getByTestId('exam-submit').click();
    await expect(page.getByTestId('exam-review-sheet')).toBeVisible();
    await expect(page.getByTestId('exam-review-counts')).toContainText('Đã làm:');
    await page.getByTestId('exam-review-submit').click();

    // Paper certificate result: the ONE mascot returns (celebrating or
    // encouraging), review list reachable.
    await expect(page.getByTestId('exam-result')).toBeVisible();
    await expect(mascotLocator(page)).toBeVisible();
    await expect(page.locator('[data-mascot-mood]')).toHaveCount(1);
  });

  test('untimed drill: paper sheet + slate verdict (no rose) + the one gold practice-next', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2);

    await page.getByTestId('hub-tile-learn').click();
    await page.getByTestId('drill-english').click();
    await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();

    const examScreen = page.getByTestId('exam-screen');
    await expect(examScreen).toBeVisible({ timeout: 15_000 });
    await expect(examScreen.locator('main')).toHaveClass(/bg-slate-50/);
    // Drill sittings carry no flag/navigator chrome (exam-mode only).
    await expect(page.getByTestId('exam-flag')).toHaveCount(0);

    // Answer whichever control the first item renders - TF / options /
    // word-order tiles / text - then the verdict appears and is ALWAYS
    // slate/emerald, never rose (D2 fix). Drill mode renders no
    // exam-next (sitting-only nav), so an unanswered word-order item
    // must have every tile tapped into the answer well to auto-judge.
    for (let i = 0; i < 12 && !(await page.getByTestId('practice-verdict').isVisible()); i++) {
      if (await page.getByTestId('exam-tf-false').isVisible()) {
        await page.getByTestId('exam-tf-false').click();
      } else if (await page.getByTestId('exam-option-0').isVisible()) {
        await page.getByTestId('exam-option-0').click();
      } else if (await page.locator('[data-testid^="exam-tile-"]').first().isVisible()) {
        await page.locator('[data-testid^="exam-tile-"]').first().click();
      } else if (await page.getByTestId('exam-text-input').isVisible()) {
        await page.getByTestId('exam-text-input').fill('x');
        await page.getByTestId('exam-text-submit').click();
      } else if (await page.getByTestId('exam-next').isVisible()) {
        await page.getByTestId('exam-next').click();
      } else {
        await page.waitForTimeout(500);
      }
    }
    const verdict = page.getByTestId('practice-verdict');
    await expect(verdict).toBeVisible();
    await expect(verdict).not.toHaveClass(/rose-/);
    await expect(page.getByTestId('practice-next')).toBeVisible();
  });
});
