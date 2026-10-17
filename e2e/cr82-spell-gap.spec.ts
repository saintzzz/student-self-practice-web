import { test, expect, type Page } from '@playwright/test';
import {
  advanceToQuestionKind,
  goToNextRound,
  runExtraLetterRound,
  startBatch,
} from './utils/batch-flow';
import { gotoApp } from './utils/auth-flow';
import {
  answerSpellItTap,
  goToNextQuestion,
  questionCard,
  readQuestionProgress,
  selectGrade,
  submitGapAwareListeningAnswer,
} from './utils/practice-flow';
import { answerOptionQuestion } from './utils/option-flow';

/**
 * CR-82 (DESIGN-SPEC-v5 s12/s13, ARCHITECTURE-v5 D-01/R-v5-08/R-v5-10):
 * browser-level coverage for the two new G1-2 Round 2 surfaces.
 *
 * - Spell-it (listening-fill-blank with a spell payload): every G1-2 Round
 *   2 carries exactly 3 of them, so advanceToQuestionKind reaches one
 *   deterministically within the round.
 * - Gap bank (listening-sentence-fill-blank with a bank payload): offered
 *   only on validator-clean items (R-v5-08), roughly a third of G1
 *   sentence items today (see gapBankCoverage.test.ts), so a random round
 *   can legitimately contain none. r34-B6: instead of retrying random
 *   batches (~0.77% miss over 3 draws), the gap test pins the dev-only
 *   `window.__batchSeedForTesting` hook to GAP_BANK_SEED - a seed
 *   verified offline to place a bank item at question 0. If vocabulary
 *   or the generator changes and the seeded draw goes cold, regenerate
 *   with: npx vite-node scripts/tmp-find-seed.ts (or any seed whose
 *   buildRound2Questions output has a sentence item with `bank`).
 *
 * No vocabulary is ever hardcoded: structural locators only
 * (spell-bank, spell-tile-N, gap-bank, gap-chip-N, sentence-gap,
 * gap-input-toggle).
 */

/* Verified via buildRound2Questions('e2e-seed-0', grade-1 pool): question
   0 is a listening-sentence-fill-blank with a validated bank. */
const GAP_BANK_SEED = 'e2e-seed-0';

async function reachRound2(page: Page): Promise<void> {
  await startBatch(page);
  await runExtraLetterRound(page);
  await goToNextRound(page);
}

/** reachRound2 with a pinned batch seed (dev hook, r34-B6). */
async function reachRound2Seeded(page: Page, seed: string): Promise<void> {
  await gotoApp(page);
  await page.evaluate((s) => {
    (window as any).__batchSeedForTesting = s;
  }, seed);
  await selectGrade(page, 0);
  await page.getByTestId('start-batch-button').click();
  await expect(page.getByTestId('round-progress')).toBeVisible();
  await runExtraLetterRound(page);
  await goToNextRound(page);
}

/** Answers the current Round 2 question non-committingly (always wrong)
 *  and advances. Never used on the item under direct test. */
async function skipRound2Question(page: Page): Promise<void> {
  const kind = await questionCard(page).getAttribute('data-question-kind');
  if (kind === 'listening-image-choice') {
    await answerOptionQuestion(page, 0);
  } else if (kind === 'listening-fill-blank' && (await page.getByTestId('spell-bank').isVisible())) {
    await answerSpellItTap(page);
  } else {
    await submitGapAwareListeningAnswer(page, '0000');
  }
  await goToNextQuestion(page);
}

test.describe('CR-82: Spell-it + Gap bank (G1-2 Round 2)', () => {
  test('Spell-it item renders the tile bank and slots, tap-placing fills the word and submits', async ({ page }) => {
    await reachRound2(page);

    const card = await advanceToQuestionKind(page, 'listening-fill-blank', 10);

    // The bank surface is present (a typed fallback means the spell
    // payload was missing - a composition regression).
    const bank = page.getByTestId('spell-bank');
    await expect(bank).toBeVisible();
    const tileCount = await bank.locator('[data-testid^="spell-tile-"]').count();
    const slotCount = await card.locator('[data-testid^="spell-slot-"]').count();
    expect(
      tileCount,
      `Spell-it bank must hold more tiles than slots (word + distractors), got ${tileCount} tiles vs ${slotCount} slots`,
    ).toBeGreaterThan(slotCount);

    const submit = page.getByTestId('submit-answer-button');
    await expect(submit).toBeDisabled();

    // Tap-place tiles until every slot is filled - submit must enable.
    for (let i = 0; i < 12; i += 1) {
      if (!(await submit.isDisabled())) break;
      await bank.locator('[data-testid^="spell-tile-"]').first().click();
    }
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByTestId('answer-feedback')).toBeVisible();
  });

  test('gap bank item renders chips, a chip tap fills the gap, and the toggle switches to typing', async ({ page }) => {
    // r34-B6: deterministic seed - the first Round 2 question IS a bank
    // item under GAP_BANK_SEED; the within-round scan survives small
    // composition drift (a cold seed still scans all questions once).
    await reachRound2Seeded(page, GAP_BANK_SEED);
    const { total } = await readQuestionProgress(page);
    let exercised = false;

    for (let q = 1; q <= total && !exercised; q++) {
      const kind = await questionCard(page).getAttribute('data-question-kind');

      const isBankItem =
        kind === 'listening-sentence-fill-blank' &&
        (await page.getByTestId('gap-bank').isVisible());
      if (!isBankItem) {
        await skipRound2Question(page);
        continue;
      }

      exercised = true;
      await test.step(`question ${q}: chip tap fills the sentence gap and enables submit`, async () => {
        const submit = page.getByTestId('submit-answer-button');
        await expect(submit).toBeDisabled();
        const chip = page.getByTestId('gap-chip-0');
        const chipWord = (await chip.innerText()).trim();
        await chip.click();
        await expect(page.getByTestId('sentence-gap')).toHaveAccessibleName(new RegExp(chipWord));
        await expect(submit).toBeEnabled();
      });

      await test.step(`question ${q}: gap-input-toggle switches to the typed peer input`, async () => {
        const toggle = page.getByTestId('gap-input-toggle');
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(page.getByTestId('answer-input')).toBeVisible();
        await expect(page.getByTestId('gap-bank')).toBeHidden();
      });
    }

    expect(
      exercised,
      `pinned seed ${GAP_BANK_SEED} produced no gap-bank item in G1 Round 2 - ` +
        'regenerate the seed (see header comment) or investigate an R-v5-08 regression',
    ).toBe(true);
  });
});
