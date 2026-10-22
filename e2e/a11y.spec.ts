import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { gotoApp } from './utils/auth-flow';
import { gradeCards, questionCard, selectGrade } from './utils/practice-flow';
import { mascotLocator } from './utils/mascot-flow';

/**
 * CR-104: runtime WCAG A/AA scan on the kid-facing surfaces - the Tester
 * convention requires a runtime a11y pass per route and none existed.
 * Serious/critical violations fail the gate; moderate/minor are reported
 * in the run log only (design-system follow-up, not a blocker).
 */
async function assertNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (results.violations.length > serious.length) {
    const minor = results.violations.filter(
      (v) => v.impact === 'minor' || v.impact === 'moderate',
    );
    console.log(
      `[a11y:${label}] advisory (minor/moderate): ${minor
        .map((v) => v.id)
        .join(', ')}`,
    );
  }
  expect(
    serious,
    `[a11y:${label}] serious violations:\n${serious
      .map((v) => `- ${v.id} (${v.impact}): ${v.nodes.length} node(s) - ${v.helpUrl}`)
      .join('\n')}`,
  ).toHaveLength(0);
}

test.describe('Runtime accessibility (WCAG A/AA, CR-104)', () => {
  test('grade select has no serious violations', async ({ page }) => {
    await gotoApp(page);
    await expect(gradeCards(page)).toHaveCount(5);
    await assertNoSeriousViolations(page, 'grade-select');
  });

  test('grade hub has no serious violations', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2); // grade-3 hub
    await expect(page.getByTestId('hub-tile-learn')).toBeVisible();
    await assertNoSeriousViolations(page, 'grade-hub');
  });

  test('batch question card has no serious violations', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 1); // grade-2
    await page.getByTestId('start-batch-button').click();
    await expect(questionCard(page)).toBeVisible();
    await assertNoSeriousViolations(page, 'batch-question');
  });

  test('game zone shelf has no serious violations', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 1);
    await page.getByTestId('hub-tile-games').click();
    await expect(page.getByTestId('game-zone-shelf')).toBeVisible();
    await assertNoSeriousViolations(page, 'game-zone-shelf');
  });

  test('exam paper screen has no serious violations', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2);
    await page.getByTestId('hub-tile-learn').click();
    await page.getByTestId('exam-program-english').click();
    await expect(mascotLocator(page)).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();
    await expect(page.getByTestId('exam-screen')).toBeVisible({ timeout: 15_000 });
    await assertNoSeriousViolations(page, 'exam-paper');
  });
});
