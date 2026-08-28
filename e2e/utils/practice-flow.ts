import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Low-level, question-kind-scoped helpers for driving the Student
 * Self-Practice app during E2E tests, rewritten for the v5 Batch/Round
 * interaction model (plans/260827-student-self-practice-site/plan.md, "v5 -
 * Batch/Round Restructure" section). Batch/Round-level navigation (grade ->
 * start-batch-button -> rounds -> round/batch summaries) lives in
 * ./batch-flow.ts, which imports the primitives below.
 *
 * This file intentionally does NOT hardcode any vocabulary word, sentence,
 * or explanation text. Every correct answer is discovered at runtime from
 * the app's own revealed-answer feedback (`answer-feedback`), same
 * discipline as the v2-v4 tester work this replaces.
 *
 * Superseded by this rewrite (removed, not just extended, per the v5 task
 * instructions): topic selection helpers, image-choice/counting-image
 * option helpers, and the old topic-session-scoped score/summary readers.
 * The v5 interaction model has no topic-selection step (Grade -> Start a
 * Batch directly) and Round 1/2 use only the extra-letter and
 * listening-sentence-fill-blank kinds, so those helpers are unused dead
 * code under the new model. Round 4 ("describe-and-choose-image") will need
 * an option-based helper again once it has real content -- add it back
 * then, not preemptively (YAGNI).
 */

export type AnswerOutcome = 'correct' | 'incorrect' | 'neutral' | 'unknown';

/** The two round kinds that have real content in this build phase. */
export type RoundQuestionKind = 'extra-letter' | 'listening-sentence-fill-blank';

export interface Fraction {
  current: number;
  total: number;
}

/**
 * Parses a "current of/per total" pair out of arbitrary UI copy, e.g.
 * "Question 3 of 10", "Cau 3/10", "Vong 2/4", "7/10". Works regardless of
 * the surrounding Vietnamese copy (AC10) since it only looks for the two
 * numbers and a separator between them.
 */
export function parseFraction(text: string, context: string): Fraction {
  const match = text.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
  if (!match) {
    throw new Error(`${context} text did not match an "X of Y" or "X/Y" pattern, got: "${text}"`);
  }
  return { current: Number(match[1]), total: Number(match[2]) };
}

export function gradeCards(page: Page): Locator {
  return page.locator('[data-testid^="grade-card-"]');
}

export async function selectGrade(page: Page, index = 0): Promise<void> {
  await gradeCards(page).nth(index).click();
}

export function questionCard(page: Page): Locator {
  return page.getByTestId('question-card');
}

export function letterTiles(page: Page): Locator {
  return questionCard(page).locator('[data-testid^="letter-tile-"]');
}

export async function readQuestionProgress(page: Page): Promise<Fraction> {
  const text = (await page.getByTestId('question-progress').textContent()) ?? '';
  return parseFraction(text, 'question-progress');
}

/**
 * Reads the current question's data-question-kind attribute and asserts it
 * is one of the kinds expected for the round currently under test (each
 * Round has exactly ONE fixed kind for its whole duration per plan.md v5,
 * unlike the old mixed-kind topic sessions), so callers pass the single
 * expected kind rather than a broad allow-list.
 */
export async function currentQuestionKind(page: Page, expectedKind: RoundQuestionKind): Promise<RoundQuestionKind> {
  const kind = await questionCard(page).getAttribute('data-question-kind');
  if (kind !== expectedKind) {
    throw new Error(
      `Expected question-card data-question-kind to be "${expectedKind}" for this round, got: "${kind}".`,
    );
  }
  return kind;
}

/**
 * Determines correct/incorrect/unknown feedback state from common signal
 * conventions (data-correct, aria-invalid, data-state, class name) applied
 * to an element after answering. These are implementation conventions, not
 * user-facing copy, so they hold even though all displayed copy is
 * Vietnamese per AC10. Returns 'unknown' if no signal is recognized, which
 * callers should treat as a failure rather than guessing.
 */
export async function readElementOutcome(element: Locator): Promise<AnswerOutcome> {
  const [className, dataState, dataCorrect, ariaInvalid] = await Promise.all([
    element.getAttribute('class'),
    element.getAttribute('data-state'),
    element.getAttribute('data-correct'),
    element.getAttribute('aria-invalid'),
  ]);

  if (dataCorrect === 'true') return 'correct';
  if (dataCorrect === 'false') return 'incorrect';
  if (ariaInvalid === 'true') return 'incorrect';
  if (ariaInvalid === 'false' && dataState === 'answered') return 'correct';

  const haystack = `${className ?? ''} ${dataState ?? ''}`.toLowerCase();
  if (/incorrect|wrong|error|invalid|red-|rose-|pink-/.test(haystack)) return 'incorrect';
  if (/correct|success|right|green-|emerald-|lime-|teal-/.test(haystack)) return 'correct';

  return 'unknown';
}

/**
 * Extracts the vocabulary word revealed in answer-feedback copy. Per AC10,
 * English is confined to question content while all instructional/
 * explanation copy is Vietnamese, so the longest plain-ASCII alphabetic
 * token in the feedback text identifies the target word without ever
 * hardcoding a vocabulary list.
 */
export function extractRevealedWord(feedbackText: string): string {
  const matches = feedbackText.match(/[A-Za-z]{2,}/g) ?? [];
  if (matches.length === 0) {
    throw new Error(
      'answer-feedback did not contain a recognizable English word to discover the answer key from. ' +
        `Got: "${feedbackText}"`,
    );
  }
  return matches.reduce((longest, candidate) => (candidate.length > longest.length ? candidate : longest));
}

async function readLetterTileTexts(tiles: Locator): Promise<string[]> {
  const count = await tiles.count();
  const letters: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await tiles.nth(i).textContent()) ?? '';
    letters.push(text.trim());
  }
  return letters;
}

/**
 * Given the letters currently rendered on the extra-letter tiles and the
 * correct word revealed in answer-feedback, finds the single tile index
 * whose removal from the displayed sequence reproduces the correct word
 * (case-insensitive). This discovers which tile is "the extra letter"
 * purely by diffing DOM content against the app's own revealed answer.
 */
export function findExtraLetterTileIndex(tileLetters: string[], correctWord: string): number {
  const target = correctWord.toLowerCase();
  for (let i = 0; i < tileLetters.length; i++) {
    const withoutTile = tileLetters
      .filter((_, index) => index !== i)
      .join('')
      .toLowerCase();
    if (withoutTile === target) return i;
  }
  throw new Error(
    `Could not find a tile index whose removal from [${tileLetters.join(', ')}] reproduces the revealed word ` +
      `"${correctWord}". extra-letter must render exactly the correct word plus one extra letter across ` +
      'letter-tile-{index} elements (plan.md Round 1).',
  );
}

export interface ExtraLetterAnswerResult {
  outcome: AnswerOutcome;
  correctWord: string;
  correctTileIndex: number;
  clickedTileIndex: number;
  feedbackText: string;
}

/**
 * Clicks the tile at tileIndex, then reads answer-feedback (which always
 * reveals the correct word regardless of outcome) and computes which tile
 * index was actually the extra letter by diffing the tiles' rendered
 * letters against that revealed word. Outcome is derived from that
 * comparison (clicked index === computed correct index), never from
 * hardcoded vocabulary or assumed tile positions.
 */
export async function answerExtraLetterTile(page: Page, tileIndex: number): Promise<ExtraLetterAnswerResult> {
  const tiles = letterTiles(page);
  const tileLetters = await readLetterTileTexts(tiles);
  await tiles.nth(tileIndex).click();

  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible();
  const feedbackText = (await feedback.innerText()).trim();
  const correctWord = extractRevealedWord(feedbackText);
  const correctTileIndex = findExtraLetterTileIndex(tileLetters, correctWord);
  const outcome: AnswerOutcome = correctTileIndex === tileIndex ? 'correct' : 'incorrect';

  return { outcome, correctWord, correctTileIndex, clickedTileIndex: tileIndex, feedbackText };
}

export async function playAudio(page: Page): Promise<void> {
  await page.getByTestId('play-audio-button').click();
}

export interface ListeningAnswerResult {
  outcome: AnswerOutcome;
  correctWord: string;
  feedbackText: string;
}

/**
 * Types guess into answer-input and submits (via submit-answer-button, or
 * Enter key when method is 'enter'), then reads answer-feedback. The
 * feedback element always contains the correct word regardless of outcome,
 * which is how the answer key is discovered without ever hardcoding
 * vocabulary or sentence content.
 */
export async function submitListeningAnswer(
  page: Page,
  guess: string,
  method: 'button' | 'enter' = 'button',
): Promise<ListeningAnswerResult> {
  const input = page.getByTestId('answer-input');
  await input.fill(guess);
  if (method === 'enter') {
    await input.press('Enter');
  } else {
    await page.getByTestId('submit-answer-button').click();
  }

  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible();
  const feedbackText = (await feedback.innerText()).trim();
  const outcome = await readElementOutcome(feedback);
  const correctWord = extractRevealedWord(feedbackText);
  return { outcome, correctWord, feedbackText };
}

export async function goToNextQuestion(page: Page): Promise<void> {
  await page.getByTestId('next-button').click();
}
