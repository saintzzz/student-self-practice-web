import { expect, test, type Page } from '@playwright/test';
import { ALL_WORDS } from '../src/data/vocabulary';
import { letterTiles, questionCard } from './utils/practice-flow';

/**
 * CR-13: guest trial - the free tier is "1 vong moi lop".
 * A real guest session (NOT beheo-force-guest, which boots authMode 'off')
 * sees a trial hint on the map, can play Round 1, and after the round-1
 * summary the upsell lock replaces "Vong tiep theo" with a login CTA.
 *
 * This spec drives the REAL configured path like auth.spec.ts - it needs
 * a reachable Supabase project for the session probe.
 */

const VOCAB_WORDS = new Set(ALL_WORDS.map((w) => w.word.toLowerCase()));
const EMOJI_TO_WORDS = new Map<string, string[]>();
for (const w of ALL_WORDS) {
  const list = EMOJI_TO_WORDS.get(w.emoji) ?? [];
  list.push(w.word.toLowerCase());
  EMOJI_TO_WORDS.set(w.emoji, list);
}

async function correctTileIndex(page: Page): Promise<number> {
  const tiles = letterTiles(page);
  const count = await tiles.count();
  const letters: string[] = [];
  for (let i = 0; i < count; i++) {
    letters.push(((await tiles.nth(i).textContent()) ?? '').trim().toLowerCase());
  }
  for (let i = 0; i < letters.length; i++) {
    const candidate = letters.filter((_, j) => j !== i).join('');
    if (VOCAB_WORDS.has(candidate)) return i;
  }
  return 0;
}

async function correctImageOptionIndex(page: Page): Promise<number> {
  const emoji = await questionCard(page)
    .locator('[data-emoji-visual]')
    .first()
    .getAttribute('data-emoji-visual');
  const options = questionCard(page).locator('[data-testid^="option-"]');
  const words = new Set(EMOJI_TO_WORDS.get(emoji ?? '') ?? []);
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const text = ((await options.nth(i).textContent()) ?? '').trim().toLowerCase();
    if (words.has(text)) return i;
  }
  return 0;
}

test.describe('Guest trial limit (CR-13)', () => {
  test('guest sees trial hint, plays Round 1, then hits the login lock', async ({ page }) => {
    // Real configured boot: wait for the login screen (Supabase probe).
    await page.goto('/');
    const guest = page.getByTestId('guest-button');
    await expect(guest).toBeVisible({ timeout: 20_000 });
    await guest.click();

    // Trial hint on the journey map.
    await expect(page.getByTestId('guest-trial-hint')).toBeVisible();

    // Play Round 1 fully.
    await page.getByTestId('grade-card-grade-1').click();
    await page.getByTestId('start-batch-button').click();
    const next = page.getByTestId('next-button');
    for (let q = 0; q < 10; q++) {
      await expect(questionCard(page)).toBeVisible();
      const kind = await questionCard(page).getAttribute('data-question-kind');
      if (kind === 'extra-letter') {
        await letterTiles(page).nth(await correctTileIndex(page)).click();
      } else {
        await questionCard(page)
          .locator('[data-testid^="option-"]')
          .nth(await correctImageOptionIndex(page))
          .click();
      }
      await expect(next).toBeEnabled();
      await next.click();
    }

    // Lock panel replaces the next-round CTA.
    await expect(page.getByTestId('round-score-summary')).toBeVisible();
    await expect(page.getByTestId('next-round-button')).toHaveCount(0);
    await expect(page.getByTestId('guest-lock-panel')).toBeVisible();

    // "Choi thu lop khac" returns to the map.
    await page.getByTestId('guest-lock-exit').click();
    await expect(page.getByTestId(/grade-card-/).first()).toBeVisible();
  });

  test('lock login CTA navigates to the login screen', async ({ page }) => {
    await page.goto('/');
    const guest = page.getByTestId('guest-button');
    await expect(guest).toBeVisible({ timeout: 20_000 });
    await guest.click();

    await page.getByTestId('grade-card-grade-2').click();
    await page.getByTestId('start-batch-button').click();
    const next = page.getByTestId('next-button');
    for (let q = 0; q < 10; q++) {
      await expect(questionCard(page)).toBeVisible();
      const kind = await questionCard(page).getAttribute('data-question-kind');
      if (kind === 'extra-letter') {
        await letterTiles(page).nth(await correctTileIndex(page)).click();
      } else {
        await questionCard(page)
          .locator('[data-testid^="option-"]')
          .nth(await correctImageOptionIndex(page))
          .click();
      }
      await expect(next).toBeEnabled();
      await next.click();
    }

    await page.getByTestId('guest-lock-login').click();
    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('guest-button')).toBeVisible();
  });
});
