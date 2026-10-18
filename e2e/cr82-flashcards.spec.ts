import { test, expect, type Page } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';
import { selectGrade } from './utils/practice-flow';

/**
 * CR-82 (DESIGN-SPEC-v5 s14, R-v5-12): browser-level coverage for the M8
 * hub-IA change (Đấu trường as a top-level tile) and the flashcards
 * route.
 *
 * Structural selectors only - no vocabulary is ever hardcoded: the deck
 * is driven by flashcard-* testids and the card counter, never by word
 * content.
 */

async function openFlashcards(page: Page): Promise<void> {
  await gotoApp(page);
  await selectGrade(page, 0); // grade-1 -> the G1-2 hub layout
  await page.getByTestId('hub-tile-more').click();
  await page.getByTestId('hub-subtile-english').click();
  await page.getByTestId('flashcards-start').click();
  /* FlashcardScreen is a lazy chunk - the default 5s is not enough under
     3-worker CPU contention (observed flake at 44s into the run). */
  await expect(page.getByTestId('flashcard-card')).toBeVisible({ timeout: 15_000 });
}

async function rateCurrent(page: Page, kind: 'known' | 'again'): Promise<void> {
  await page.getByTestId(kind === 'known' ? 'flashcard-known' : 'flashcard-again').click();
  /* The exit animation (~250ms) settles before the next card mounts -
     wait for the card to be usable again or the summary to appear. */
  await expect(
    page.getByTestId('flashcard-known').or(page.getByTestId('flashcard-summary')),
  ).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('flashcard-known')).toBeEnabled({ timeout: 3000 }).catch(() => {});
}

test.describe('CR-82: Hub IA + flashcards', () => {
  test('G1-2 hub shows Đấu trường as a top-level tile, not a subtile', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 0);

    await expect(page.getByTestId('hub-tile-more')).toBeVisible();
    await expect(page.getByTestId('hub-tile-arena')).toBeVisible();
    await expect(page.getByTestId('hub-tile-reward')).toBeVisible();
    // The rank wrapper stays mounted under aria-controls; the arena
    // section only exists when Supabase is configured (handlers present).
    await expect(page.getByTestId('hub-tile-arena')).toHaveAttribute(
      'aria-controls',
      /hub-panel-rank/,
    );

    await page.getByTestId('hub-tile-more').click();
    await expect(page.getByTestId('hub-subtile-english')).toBeVisible();
    await expect(page.getByTestId('hub-subtile-arena')).toHaveCount(0);
  });

  test('flashcards: rate the whole deck -> summary -> back to hub', async ({ page }) => {
    await openFlashcards(page);

    await expect(page.getByTestId('flashcard-counter')).toContainText('Thẻ 1/');

    // Flip reveals the back face; the speaker never flips the card.
    const card = page.getByTestId('flashcard-card');
    await page.getByTestId('flashcard-flip').click();
    await expect(card).toHaveAttribute('data-face', 'back');
    await page.getByTestId('flashcard-speaker').click();
    await expect(card).toHaveAttribute('data-face', 'back');

    // First card "Ôn lại" so the summary offers the retry-again deck.
    await rateCurrent(page, 'again');
    // Remaining cards "Em nhớ rồi" until the summary mounts (<= 12).
    for (let i = 0; i < 12; i += 1) {
      if (await page.getByTestId('flashcard-summary').isVisible().catch(() => false)) break;
      await rateCurrent(page, 'known');
    }

    const summary = page.getByTestId('flashcard-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Em đã xem hết');
    await expect(page.getByTestId('flashcard-chip-again')).toContainText('Ôn lại: 1');
    await expect(page.getByTestId('flashcard-retry-again')).toContainText('Ôn lại 1 thẻ');

    // "Ôn lại k thẻ" replays exactly the again-rated cards.
    await page.getByTestId('flashcard-retry-again').click();
    await expect(page.getByTestId('flashcard-card')).toBeVisible();
    await expect(page.getByTestId('flashcard-counter')).toContainText('Thẻ 1/1');

    // KẾT THÚC asks for confirmation, then lands on the zero-exit summary.
    await page.getByTestId('flashcard-end').click();
    await page.getByTestId('end-confirm-ok').click();
    await expect(page.getByTestId('flashcard-summary')).toBeVisible();

    // Back to the hub - the launchpad tiles are on-screen again.
    await page.getByTestId('flashcard-summary-exit').click();
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await expect(page.getByTestId('hub-tile-arena')).toBeVisible();
  });

  test('chunk failure shows the retry panel; exit returns to the hub', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 0);

    /* Abort only the flashcard module request - the app keeps running.
       (Dev server: /src/.../FlashcardScreen.tsx; prod build:
       FlashcardScreen-<hash>.js - the glob covers both.) Browsers cache
       a failed module fetch per URL, so "Thử lại" cannot recover this
       simulated outage - the assertions below cover the deterministic
       degradation path (retry -> reload affordance -> exit). The fresh-
       invocation retry accounting itself is unit-tested. */
    await page.route('**/FlashcardScreen*', (route) => route.abort());
    await page.getByTestId('hub-tile-more').click();
    await page.getByTestId('hub-subtile-english').click();
    await page.getByTestId('flashcards-start').click();

    const panel = page.getByTestId('flashcard-error');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel).toContainText('Chưa mở được bộ thẻ');
    await expect(page.getByTestId('flashcard-error-retry')).toBeVisible();
    await expect(page.getByTestId('flashcard-error-reload')).toHaveCount(0);

    // A second failed attempt unmasks the deliberate-reload affordance.
    await page.getByTestId('flashcard-error-retry').click();
    await expect(page.getByTestId('flashcard-error-reload')).toBeVisible();

    // The child always has a way out - no dead end on a failed chunk.
    await page.getByTestId('flashcard-error-exit').click();
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await page.unroute('**/FlashcardScreen*');
  });

  test('keyboard: ArrowRight rates the card (no swipe required)', async ({ page }) => {
    await openFlashcards(page);
    /* The deck's keydown handler lives on the stack wrapper - focus a
       control inside it (the flip button) so the event bubbles there. */
    await page.getByTestId('flashcard-flip').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('flashcard-counter')).toContainText('Thẻ 2/', {
      timeout: 3000,
    });
  });
});
