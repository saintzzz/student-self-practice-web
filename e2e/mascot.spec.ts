import { test, expect } from '@playwright/test';
import { runExtraLetterRound, startBatch } from './utils/batch-flow';
import { selectGrade } from './utils/practice-flow';
import { expectMascotVisible, findExtraLetterOutcome, mascotLocator } from './utils/mascot-flow';

/**
 * Covers plan.md v10 ("App-Wide Mascot") AC38: the pig mascot (🐷) appears
 * on the Start Batch screen, the feedback panel (both correct and incorrect
 * states), the Round summary, and the Batch summary, using the same emoji
 * throughout.
 *
 * No exact data-testid is assumed for the mascot element (plan.md v10 did
 * not pin one) -- every check below discovers SOME element containing the
 * pig emoji via ./utils/mascot-flow.ts's text-content discovery technique,
 * matching this suite's established discovery-over-hardcoding discipline.
 * Per this task's instructions, animation/CSS classes are never asserted on
 * (an implementation detail likely to churn) -- only presence and
 * visibility at the key moments listed in AC38.
 *
 * If the mascot has not landed on a given screen yet, the relevant test
 * below fails with a clear "not visible" timeout -- the expected signal of
 * an in-progress or differently-shaped v10 build, not a test bug.
 */
test.describe('App-wide pig mascot (plan.md v10 AC38)', () => {
  test('pig mascot is visible on the Start Batch screen', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page);
    await expect(
      page.getByTestId('start-batch-button'),
      'expected to land on the Start Batch screen after selecting a grade',
    ).toBeVisible();

    await expectMascotVisible(page, undefined, 'on the Start Batch screen');
  });

  test('pig mascot is visible in the feedback panel after a correct answer', async ({ page }) => {
    const { feedback } = await findExtraLetterOutcome(page, 'correct');
    await expect(feedback, 'expected answer-feedback to be visible for the found correct outcome').toBeVisible();

    await expectMascotVisible(page, feedback, 'in the feedback panel after a correct answer');
  });

  test('pig mascot is visible in the feedback panel after an incorrect answer', async ({ page }) => {
    const { feedback } = await findExtraLetterOutcome(page, 'incorrect');
    await expect(feedback, 'expected answer-feedback to be visible for the found incorrect outcome').toBeVisible();

    await expectMascotVisible(page, feedback, 'in the feedback panel after an incorrect answer');
  });

  test('pig mascot is visible on the Round summary screen', async ({ page }) => {
    await startBatch(page);
    await runExtraLetterRound(page);

    await expect(page.getByTestId('round-score-summary')).toBeVisible();
    await expectMascotVisible(page, undefined, 'on the Round summary screen');
  });

  test('the same pig emoji glyph appears on the Start Batch screen and in the feedback panel (character consistency)', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page);
    const startScreenMascotText = (await mascotLocator(page).innerText()).trim();

    const { feedback } = await findExtraLetterOutcome(page, 'incorrect');
    const feedbackMascotText = (await mascotLocator(page, feedback).innerText()).trim();

    expect(
      startScreenMascotText,
      `expected the Start Batch screen's mascot text to contain the pig emoji, got: "${startScreenMascotText}"`,
    ).toContain('🐷');
    expect(
      feedbackMascotText,
      `expected the feedback panel's mascot text to contain the same pig emoji, got: "${feedbackMascotText}"`,
    ).toContain('🐷');
  });
});
