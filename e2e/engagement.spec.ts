import { expect, test, type Page } from '@playwright/test';
import { ALL_WORDS } from '../src/data/vocabulary';
import { gotoApp } from './utils/auth-flow';
import { letterTiles, questionCard } from './utils/practice-flow';

/**
 * CR-10 AC-T5: engagement journey - the star bank / streak / sticker
 * album surface on the journey map and a finished Round actually banks
 * progress (stars + streak) visible after returning to the map.
 *
 * Round 1 mixes extra-letter + image-choice. Correct answers are
 * computed deterministically from the shipped content itself - never
 * hardcoded:
 *  - extra-letter: the single-letter removal that yields a real vocab
 *    word is the extra letter.
 *  - image-choice: the prompt's `data-emoji-visual` emoji maps back to
 *    the vocab word(s) that carry it.
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

test.describe('Engagement layer (CR-10)', () => {
  test('journey map shows star bank, streak and the sticker album', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByTestId('star-bank-chip')).toBeVisible();
    await expect(page.getByTestId('streak-chip')).toBeVisible();

    await page.getByTestId('sticker-album-button').click();
    const album = page.getByTestId('sticker-album');
    await expect(album).toBeVisible();
    for (const id of ['first-batch', 'perfect-round', 'streak-3', 'explorer', 'star-hoard']) {
      await expect(album.getByTestId(`sticker-${id}`)).toBeVisible();
    }
    await page.getByTestId('sticker-album-close').click();
    await expect(album).not.toBeVisible();
  });

  test('finishing Round 1 banks stars + streak, visible on the map', async ({ page }) => {
    await gotoApp(page);
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

    // Round summary: star rain + recorded stars.
    await expect(page.getByTestId('round-score-summary')).toBeVisible();
    await expect(page.getByTestId('star-rain')).toBeVisible();

    // Back on the map the chips reflect banked progress.
    await gotoApp(page);
    const starChip = await page.getByTestId('star-bank-chip').textContent();
    const streakChip = await page.getByTestId('streak-chip').textContent();
    expect(Number(starChip?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThan(0);
    expect(Number(streakChip?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
