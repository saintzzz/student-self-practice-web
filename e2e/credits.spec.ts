import { test, expect } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';

/**
 * Covers PRD r3 (docs/sdlc/prd.md) AC-7.x: a Credits screen listing the
 * Twemoji + Noto animated-emoji collections and any approved vocabulary
 * photos, with license labels and source links, reachable from the grade
 * screen and navigable back.
 *
 * The app loads /attribution.json at runtime, so these tests also exercise
 * that fetch indirectly: if the manifest is missing or malformed, the
 * collection cards never appear and the expectations below time out - a
 * real signal, not a test bug.
 */

test.describe('Credits screen (PRD r3 AC-7.x)', () => {
  test('grade screen shows a credits entry point that opens the Credits screen', async ({ page }) => {
    await gotoApp(page);

    const link = page.getByTestId('credits-link');
    await expect(link, 'expected a Credits entry point on the grade screen').toBeVisible();
    await link.click();

    // The collection cards load asynchronously from /attribution.json -
    // wait for either collections or a visible error state.
    await expect(
      page.getByTestId('credits-collection-twemoji'),
      'expected the Twemoji collection card after attribution.json loads',
    ).toBeVisible();
  });

  test('credits screen lists emoji collections with license labels and source links', async ({ page }) => {
    await gotoApp(page);
    await page.getByTestId('credits-link').click();

    const twemoji = page.getByTestId('credits-collection-twemoji');
    const noto = page.getByTestId('credits-collection-noto-animated-emoji');
    await expect(twemoji).toBeVisible();
    await expect(noto, 'expected the Noto animated-emoji collection card').toBeVisible();

    for (const card of [twemoji, noto]) {
      await expect(card, 'each collection shows a license label').toContainText(/CC-BY|CC BY/i);
      await expect(card, 'each collection shows its source URL').toContainText(/Nguồn: http/);
      // AC-7.5: URLs render as plain text for a child-safe surface - never
      // anchors - so there must be zero <a> elements inside a collection card.
      await expect(card.locator('a'), 'collection URLs must be plain text, not anchors (AC-7.5)').toHaveCount(0);
    }
  });

  test('Credits is keyboard navigable: Tab + Enter opens and closes it, with a visible focus ring (AC-7.10)', async ({
    page,
  }) => {
    await gotoApp(page);

    // Tab forward until the credits entry point owns focus.
    const link = page.getByTestId('credits-link');
    for (let i = 0; i < 10; i++) {
      if (await link.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(link).toBeFocused();
    // The existing focus style is focus:ring-4 - assert the class is on the
    // element so the visible-ring contract survives a refactor.
    await expect(link).toHaveClass(/focus:ring-4/);

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('credits-collection-twemoji')).toBeVisible();

    const back = page.getByTestId('credits-back');
    for (let i = 0; i < 10; i++) {
      if (await back.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(back).toBeFocused();
    await expect(back).toHaveClass(/focus:ring-4/);

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('grade-card-grade-2')).toBeVisible();
  });

  test('credits back button returns to the grade screen', async ({ page }) => {
    await gotoApp(page);
    await page.getByTestId('credits-link').click();
    await expect(page.getByTestId('credits-collection-twemoji')).toBeVisible();

    await page.getByTestId('credits-back').click();
    await expect(
      page.getByTestId('grade-card-grade-2'),
      'expected to return to the grade-selection screen after Credits back',
    ).toBeVisible();
  });
});
