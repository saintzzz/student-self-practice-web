import { type Locator, type Page, expect } from '@playwright/test';
import { answerExtraLetterTile, goToNextQuestion, readQuestionProgress } from './practice-flow';
import { startBatch } from './batch-flow';

/**
 * Mascot discovery helpers for plan.md v10 ("App-Wide Mascot"), AC38-AC39.
 * The engineer's exact data-testid for the mascot element was not pinned by
 * plan.md v10, so this discovers SOME visible element containing the pig
 * emoji (🐷, the stakeholder's own explicit suggestion, plan.md v10) within
 * a given scope, rather than assuming any testid -- same discovery-over-
 * hardcoding discipline as every other *-flow.ts file in this suite.
 * Playwright's getByText matches on rendered text regardless of the
 * wrapping element's own testid/attributes, so this holds even if the
 * mascot is nested inside a labelled container.
 *
 * Written BEFORE this task could confirm the real v10 implementation's exact
 * DOM shape. If 🐷 is never found in an expected scope, callers get a clear
 * "not visible" timeout -- the expected signal of a not-yet-landed (or
 * differently-shaped) v10 change, not a helper bug.
 */

const PIG_EMOJI = '🐷';

export function mascotLocator(page: Page, within?: Locator): Locator {
  const scope = within ?? page.locator('body');
  return scope.getByText(PIG_EMOJI).first();
}

export async function expectMascotVisible(page: Page, within: Locator | undefined, context: string): Promise<void> {
  await expect(
    mascotLocator(page, within),
    `expected a pig-emoji (🐷) mascot element to be visible ${context} (plan.md v10 AC38). This is the expected ` +
      'failure signal if the v10 mascot has not landed on this screen yet.',
  ).toBeVisible();
}

export interface ExtraLetterOutcomeSearchResult {
  feedback: Locator;
  correctWord: string;
}

/**
 * Searches for a naturally-occurring Round 1 (extra-letter) answer outcome
 * matching desiredOutcome, always clicking tile index 0 (a structural
 * choice, never a hardcoded vocabulary assumption -- same technique as
 * answerExtraLetterTile/runExtraLetterRound elsewhere in this suite).
 * 'incorrect' is found virtually immediately (index 0 is only correct for 1
 * tile out of several per question, so most single guesses are naturally
 * wrong already). 'correct' is rarer per single question (this app has no
 * "guaranteed right answer" test hook, unlike the round timer's documented
 * fast-forward hook), so this searches across up to maxBatches fresh
 * Batches (each re-seeding a freshly random Round 1) before giving up. This
 * keeps the search entirely free of any hardcoded content while staying
 * practically deterministic: the chance of exhausting every question across
 * every batch attempt without a single natural correct hit is astronomically
 * small for a well-formed random generator, and if that ever happens it is
 * itself a real signal worth investigating (a broken generator or
 * outcome-detection technique), not a reason to quietly skip.
 *
 * Leaves the app sitting exactly on the question where the desired outcome
 * was found (its answer-feedback still visible, next-button not yet
 * clicked), so the caller can inspect the feedback panel immediately.
 */
export async function findExtraLetterOutcome(
  page: Page,
  desiredOutcome: 'correct' | 'incorrect',
  maxBatches = 5,
): Promise<ExtraLetterOutcomeSearchResult> {
  for (let attempt = 1; attempt <= maxBatches; attempt++) {
    await startBatch(page);
    const { total } = await readQuestionProgress(page);
    for (let q = 1; q <= total; q++) {
      const result = await answerExtraLetterTile(page, 0);
      if (result.outcome === desiredOutcome) {
        return { feedback: page.getByTestId('answer-feedback'), correctWord: result.correctWord };
      }
      await goToNextQuestion(page);
    }
  }
  throw new Error(
    `Could not find a naturally occurring "${desiredOutcome}" Round 1 (extra-letter) outcome across ${maxBatches} ` +
      'fresh Batches (clicking tile index 0 every time, never a hardcoded content assumption). This is either ' +
      'extreme bad luck or a sign the random-question generator/outcome-detection technique is broken.',
  );
}
