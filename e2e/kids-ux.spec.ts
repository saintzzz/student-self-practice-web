import { test, expect } from '@playwright/test';
import { gotoApp } from './utils/auth-flow';
import { selectGrade } from './utils/practice-flow';

/**
 * kids-UX redesign (PRD R1/R2/R5): launchpad IA, parent gate, and the
 * Khám phá sheet. Covers AC-2.1/2.2/2.3 (one gold CTA + sheet), AC-5.1
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

test.describe('kids-UX: launchpad (AC-2.x)', () => {
  test('G1-2: one gold CTA, everything else inside the Khám phá sheet', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 0); // grade-1

    // First paint: the gold CTA is there; the exam tiles are NOT.
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await expect(page.getByTestId('explore-toggle')).toBeVisible();
    // CR-72: the instruction speaker is headless - it autoplays on every
    // screen for every grade and renders no button. Assert the chrome is
    // gone and the instruction text is what remains.
    await expect(page.getByTestId('instruction-speaker')).toHaveCount(0);
    await expect(page.getByText('Mình cùng chơi 4 trò nhỏ nhé!', { exact: false })).toBeVisible();
    await expect(page.getByTestId('drill-english')).not.toBeVisible();

    // Sheet opens, carries the relocated surfaces, and closes cleanly.
    await page.getByTestId('explore-toggle').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('drill-english')).toBeVisible();
    await page.getByTestId('explore-close').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // Focus returns to the toggle (modal contract).
    await expect(page.getByTestId('explore-toggle')).toBeFocused();
  });

  test('G3-5: sheet still holds drill/exam entries and they still launch', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page, 2); // grade-3

    await page.getByTestId('explore-toggle').click();
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
