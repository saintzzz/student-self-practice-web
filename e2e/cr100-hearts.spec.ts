import { test, expect } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';
import { selectGrade } from './utils/practice-flow';

/**
 * CR-100 e2e: player level ring on the map HUD, Game Zone locked card
 * hint, and the shared 3-heart meter inside a real game run (WhackMole).
 */
test.describe('CR-100 engagement economy', () => {
  test('level ring on the map, locked card hints, hearts drop on a wrong whack', async ({ page }) => {
    await gotoApp(page);

    // A2': level ring is a segment of the EngagementBar HUD on the map.
    await expect(page.getByTestId('level-chip')).toBeVisible();
    await expect(page.getByTestId('level-chip')).toContainText('Tân binh');

    await selectGrade(page, 0); // grade-1
    await page.getByTestId('hub-tile-games').click();
    await expect(page.getByTestId('game-zone-shelf')).toBeVisible();

    // CR-99 locked teaser: tapping answers with a hint, not silence.
    const locked = page.getByTestId('game-card-coming-soon');
    await expect(locked).toBeVisible();
    await locked.click();
    await expect(locked).toContainText('Sắp mở rồi!');

    // B5: heart meter inside a real run.
    await page.getByTestId('game-card-whack-a-mole').click();
    await expect(page.getByTestId('game-level-picker')).toBeVisible();
    await page.getByTestId('game-level-1').click();
    const hearts = page.getByTestId('heart-meter');
    await expect(hearts).toBeVisible();
    await expect(hearts).toHaveAttribute('aria-label', /3\/3/);

    // Deterministic wrong pick via the field's own data-correct marking.
    await page.locator('[data-testid^="option-"][data-correct="false"]').first().click();
    await expect(hearts).toHaveAttribute('aria-label', /2\/3/, { timeout: 3_000 });
  });
});
