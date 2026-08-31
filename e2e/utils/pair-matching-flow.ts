import { type Locator, type Page, expect } from '@playwright/test';
import {
  type Fraction,
  type RoundQuestionKind,
  currentQuestionKindOneOf,
  goToNextQuestion,
  parseFraction,
  questionCard,
  readElementOutcome,
  readQuestionProgress,
} from './practice-flow';
import { answerOptionQuestion } from './option-flow';

/**
 * picture-pair-matching board helpers, plan.md v8 "Round 4 Addition:
 * Picture-Pair-Matching Board" / AC31, AC32. Written BEFORE a real
 * implementation existed -- per plan.md v8's "File Ownership" section, this
 * addition is built sequentially AFTER the Round 2 listening-image-choice
 * addition lands (both touch the same shared integration files, so they
 * cannot be built concurrently). If picture-pair-matching never appears in
 * Round 4's question pool, advanceToPicturePairMatching below returns null
 * and every test built on it fails with a clear "not found" message -- the
 * expected signal of a not-yet-landed sequential task, not a test bug.
 *
 * ASSUMPTIONS about the board's DOM/behavior (informed by plan.md's spec
 * text, not a verified implementation):
 * - All 8 pair-tile-{index} elements render their real content (an English
 *   word OR a single emoji/picture) at all times -- this is a
 *   content-matching board, not a hidden-face memory game, per plan.md's "a
 *   board of exactly 4 word-picture pairs (8 tiles total: 4 English-word
 *   tiles + 4 emoji/picture tiles, shuffled together)" wording, which
 *   describes what is shown, not a flip mechanic.
 * - A tile's content structurally identifies its type without any
 *   vocabulary lookup: a word tile's text matches /^[A-Za-z][A-Za-z\s]*$/
 *   (plain English letters, optionally multiple words), a picture tile's
 *   does not (an emoji/pictograph). This lets every helper below
 *   distinguish "word tile" from "picture tile" without ever hardcoding a
 *   specific word-to-emoji mapping.
 * - Clicking two tiles evaluates the pair immediately; a correct match
 *   leaves both tiles showing the shared 'correct' styling signal
 *   (readElementOutcome, same convention as every other kind in this app)
 *   and stays revealed/locked; an incorrect pair shows an 'incorrect'
 *   signal then both tiles reset to clickable, per plan.md "an incorrect
 *   pair briefly flashes and both tiles reset for another attempt".
 * - pair-matching-mistake-count's text is parseable as a "current/total"
 *   fraction (e.g. "Sai: 1/3") via practice-flow.ts's parseFraction, with
 *   total reflecting the 3-mistake budget (AC32).
 * - Once the board is resolved (all 4 pairs found, or mistakes exceed 3),
 *   the shared next-button (same shell as every other question kind)
 *   becomes enabled to advance to the next Round 4 question.
 *
 * If the real implementation differs from any of the above, these helpers --
 * not the assertions built on top of them -- are what need revision.
 */

const ROUND4_KINDS: RoundQuestionKind[] = ['describe-and-choose-image', 'picture-pair-matching'];

export function pairTiles(page: Page): Locator {
  return questionCard(page).locator('[data-testid^="pair-tile-"]');
}

export async function readPairTileTexts(page: Page): Promise<string[]> {
  const tiles = pairTiles(page);
  const count = await tiles.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    texts.push(((await tiles.nth(i).textContent()) ?? '').trim());
  }
  return texts;
}

/** Structural word-vs-picture classification -- see file doc comment. */
export function isWordLikeTile(text: string): boolean {
  return /^[A-Za-z][A-Za-z\s]*$/.test(text);
}

export async function readMistakeCount(page: Page): Promise<Fraction> {
  const text = (await page.getByTestId('pair-matching-mistake-count').textContent()) ?? '';
  return parseFraction(text, 'pair-matching-mistake-count');
}

export interface PairAttemptResult {
  matched: boolean;
  firstOutcome: string;
  secondOutcome: string;
}

/** Clicks the two given tile indices and reads back both tiles' post-click styling signal. */
export async function attemptPair(page: Page, indexA: number, indexB: number): Promise<PairAttemptResult> {
  const tiles = pairTiles(page);
  await tiles.nth(indexA).click();
  await tiles.nth(indexB).click();

  const firstOutcome = await readElementOutcome(tiles.nth(indexA));
  const secondOutcome = await readElementOutcome(tiles.nth(indexB));
  const matched = firstOutcome === 'correct' && secondOutcome === 'correct';
  return { matched, firstOutcome, secondOutcome };
}

export interface FindMatchResult {
  wordTileIndex: number;
  matchedPictureTileIndex: number;
  mistakesMade: number;
}

/**
 * Finds one real correct pair by structural elimination, never hardcoded
 * vocabulary: picks the first word-like tile, then tries pairing it with
 * each picture-like tile in turn until attemptPair reports a match. This is
 * guaranteed to succeed within at most 4 tries (3 wrong + 1 right in the
 * worst case, since there are exactly 4 picture tiles and exactly one of
 * them matches the chosen word tile), which stays within AC32's "up to 3
 * mistakes allowed" budget for a single board.
 */
export async function findMatchByElimination(page: Page): Promise<FindMatchResult> {
  const texts = await readPairTileTexts(page);
  const wordIndices = texts.reduce<number[]>((acc, text, i) => {
    if (isWordLikeTile(text)) acc.push(i);
    return acc;
  }, []);
  const pictureIndices = texts.reduce<number[]>((acc, text, i) => {
    if (!isWordLikeTile(text)) acc.push(i);
    return acc;
  }, []);

  if (wordIndices.length === 0 || pictureIndices.length === 0) {
    throw new Error(
      'Could not classify the 8 pair-tile elements into word-like/picture-like groups from their text content: ' +
        `[${texts.join(', ')}]. picture-pair-matching's DOM contract may differ from this suite's assumptions (see ` +
        'pair-matching-flow.ts\'s file doc comment).',
    );
  }

  const wordTileIndex = wordIndices[0];
  let mistakesMade = 0;

  for (const pictureTileIndex of pictureIndices) {
    const attempt = await attemptPair(page, wordTileIndex, pictureTileIndex);
    if (attempt.matched) {
      return { wordTileIndex, matchedPictureTileIndex: pictureTileIndex, mistakesMade };
    }
    mistakesMade++;
  }

  throw new Error(
    `Tried word tile ${wordTileIndex} against every picture-like tile [${pictureIndices.join(', ')}] without a ` +
      'single match -- expected exactly one to match by the board\'s own "4 word-picture pairs" contract.',
  );
}

/**
 * Forces the board to exceed its 3-mistake budget (AC32) using ONLY
 * word-tile-vs-word-tile pairings, which are structurally guaranteed
 * mismatches (a real pair is always one word tile + one picture tile per
 * plan.md's board composition) -- never risks accidentally landing on a
 * correct pair, and never depends on vocabulary knowledge. The final
 * (budget-exceeding) attempt's own matched/not-matched outcome is not
 * asserted, since the board may transition into a "reveal everything"
 * state right at that click, making a strict per-tile check on that
 * specific attempt ambiguous -- callers should verify the reveal via
 * readMistakeCount / full-board readElementOutcome checks instead.
 */
export async function forceMistakeLimitExceeded(page: Page, mistakesNeeded = 4): Promise<number> {
  const texts = await readPairTileTexts(page);
  const wordIndices = texts.reduce<number[]>((acc, text, i) => {
    if (isWordLikeTile(text)) acc.push(i);
    return acc;
  }, []);

  if (wordIndices.length < 2) {
    throw new Error(
      `Expected at least 2 word-like tiles to pair together for guaranteed-wrong attempts, found ${wordIndices.length} ` +
        `from: [${texts.join(', ')}].`,
    );
  }

  let mistakesMade = 0;
  let cursor = 0;
  while (mistakesMade < mistakesNeeded) {
    const a = wordIndices[cursor % wordIndices.length];
    const b = wordIndices[(cursor + 1) % wordIndices.length];
    const isFinalMistake = mistakesMade === mistakesNeeded - 1;
    const attempt = await attemptPair(page, a, b);
    if (!isFinalMistake) {
      expect(
        attempt.matched,
        `word tile ${a} vs word tile ${b} must never match (two words can never be a real pair)`,
      ).toBe(false);
    }
    mistakesMade++;
    cursor++;
  }
  return mistakesMade;
}

/**
 * Skips forward through Round 4 questions, structurally answering every
 * describe-and-choose-image question along the way (option index 0, same
 * technique as round34-flow.ts's runDescribeAndChooseImageRound), stopping
 * as soon as a picture-pair-matching question is reached WITHOUT answering
 * it (left for the caller to inspect/answer via this file's board helpers).
 * Returns the 1-based question number it stopped on, or null if the round
 * ended without ever showing a picture-pair-matching question -- see this
 * file's doc comment for why that is an expected "not landed yet" signal,
 * not a test bug.
 */
export async function advanceToPicturePairMatching(page: Page): Promise<number | null> {
  const { total } = await readQuestionProgress(page);

  for (let q = 1; q <= total; q++) {
    const progress = await readQuestionProgress(page);
    expect(progress.current, `expected question ${q} of Round 4`).toBe(q);
    const kind = await currentQuestionKindOneOf(page, ROUND4_KINDS);

    if (kind === 'picture-pair-matching') {
      return q;
    }

    await answerOptionQuestion(page, 0);
    await goToNextQuestion(page);
  }

  return null;
}
