import { test, expect } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';
import { selectGrade } from './utils/practice-flow';

/**
 * kids-UX launchpad (CR-73 redesign): launchpad IA + parent gate.
 * The Khám phá bottom sheet is replaced by the inline Mode Hub:
 * labeled section tiles expand in place inside a paper panel.
 * Covers the amended AC-2.x (collapsed-element count) + AC-5.1
 * (report pill gated).
 */

const NUMBER_WORDS: Record<string, number> = {
  hai: 2, ba: 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9,
};

/** Parses "Bảy nhân tám bằng bao nhiêu?" -> 56 and types it on the keypad. */
async function solveParentGate(page: import('@playwright/test').Page): Promise<void> {
  const text = (await page.getByTestId('parent-gate-question').textContent()) ?? '';
  const match = text.toLowerCase().match(/(\p{L}+)\s+nhân\s+(\p{L}+)/u);
  if (!match) throw new Error(`gate question unparsable: "${text}"`);
  const a = NUMBER_WORDS[match[1]!];
  const b = NUMBER_WORDS[match[2]!];
  if (!a || !b) throw new Error(`gate words unknown: ${match[1]} ${match[2]}`);
  for (const digit of String(a * b)) {
    await page.getByTestId(`parent-gate-key-${digit}`).click();
  }
  await page.getByTestId('parent-gate-ok').click();
}

test.describe('kids-UX: launchpad (CR-73)', () => {
  test('G1-2: one gold CTA + two hub tiles; programs behind per-program subtiles', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 0); // grade-1

    // First paint: gold CTA + the two hub tiles are there; programs are NOT.
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await expect(page.getByTestId('hub-tile-more')).toBeVisible();
    await expect(page.getByTestId('hub-tile-reward')).toBeVisible();
    await expect(page.getByTestId('instruction-speaker')).toHaveCount(0);
    await expect(page.getByText('Mình cùng chơi 4 trò nhỏ nhé!', { exact: false })).toBeVisible();
    await expect(page.getByTestId('drill-english')).toHaveCount(0);

    // Luyện thêm expands inline (no dialog), subtiles appear, program
    // modes one level deeper.
    await page.getByTestId('hub-tile-more').click();
    await expect(page.getByTestId('hub-subtile-english')).toBeVisible();
    await page.getByTestId('hub-subtile-english').click();
    await expect(page.getByTestId('drill-english')).toBeVisible();
    // Collapsing keeps focus on the tile (no focus-return needed - the
    // focus never left it).
    await page.getByTestId('hub-tile-more').click();
    await expect(page.getByTestId('hub-subtile-english')).toHaveCount(0);
  });

  test('G3-5: hub tiles hold drill/exam entries and they still launch', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2); // grade-3

    await page.getByTestId('hub-tile-learn').click();
    await page.getByTestId('drill-english').click();
    // Practice mode lands on the drill intro screen first.
    await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
    await expect(page.getByTestId('exam-screen')).toBeVisible();
  });
});

test.describe('kids-UX: parent gate (AC-5.1)', () => {
  test('Góc ba mẹ asks the arithmetic gate, then opens the report', async ({ page }) => {
    await gotoApp(page);
    const reportBtn = page.getByTestId('open-parent-report');
    await reportBtn.click();
    await expect(page.getByTestId('parent-gate')).toBeVisible();
    await solveParentGate(page);
    await expect(page.getByTestId('report-back')).toBeVisible({ timeout: 5000 });
  });
});
