import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Shared helpers for driving the Student Self-Practice app during E2E tests.
 * These helpers rely only on the data-testid contract documented in
 * plans/260827-student-self-practice-site/plan.md ("Required data-testid
 * Contract v2" plus the v3 additions for `counting-image` and
 * `extra-letter`) and never assert on specific vocabulary words or question
 * wording. Correct answers are always discovered at runtime from the app's
 * own revealed-answer feedback, never hardcoded.
 */

export interface QuestionProgress {
  current: number;
  total: number;
}

export interface ScoreSummary {
  correct: number;
  total: number;
}

export type AnswerOutcome = 'correct' | 'incorrect' | 'neutral' | 'unknown';

export type QuestionKind = 'image-choice' | 'listening-fill-blank' | 'counting-image' | 'extra-letter';

/** All 4 question kinds per plan.md v3 "Data Model Note". */
export const ALL_QUESTION_KINDS: readonly QuestionKind[] = [
  'image-choice',
  'listening-fill-blank',
  'counting-image',
  'extra-letter',
];

/** AC11: at least 10 distinct topics. */
export const MIN_TOPIC_COUNT = 10;

export type CountDirection = 'count-to-image' | 'image-to-count';

export function gradeCards(page: Page): Locator {
  return page.locator('[data-testid^="grade-card-"]');
}

export function topicCards(page: Page): Locator {
  return page.locator('[data-testid^="topic-card-"]');
}

export function questionCard(page: Page): Locator {
  return page.getByTestId('question-card');
}

export function optionButtons(page: Page): Locator {
  return questionCard(page).locator('[data-testid^="option-"]');
}

/** New in v3: clickable letter tiles for the extra-letter question kind. */
export function letterTiles(page: Page): Locator {
  return questionCard(page).locator('[data-testid^="letter-tile-"]');
}

export function incorrectItems(page: Page): Locator {
  return page.locator('[data-testid^="incorrect-item-"]');
}

export async function selectGrade(page: Page, index = 0): Promise<void> {
  await gradeCards(page).nth(index).click();
}

export async function selectTopic(page: Page, index = 0): Promise<void> {
  await topicCards(page).nth(index).click();
}

export async function goBackToGrades(page: Page): Promise<void> {
  await page.getByTestId('back-to-grades').click();
}

/** Reads the testid attribute values of every currently rendered topic card. */
export async function readTopicTestIds(page: Page): Promise<string[]> {
  const cards = topicCards(page);
  const count = await cards.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await cards.nth(i).getAttribute('data-testid');
    if (id) ids.push(id);
  }
  return ids.sort();
}

export async function readQuestionProgress(page: Page): Promise<QuestionProgress> {
  const text = (await page.getByTestId('question-progress').textContent()) ?? '';
  const match = text.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
  if (!match) {
    throw new Error(`question-progress text did not match "Question X of Y", got: "${text}"`);
  }
  return { current: Number(match[1]), total: Number(match[2]) };
}

export async function readScoreSummary(page: Page): Promise<ScoreSummary> {
  const text = (await page.getByTestId('score-summary').textContent()) ?? '';
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`score-summary text did not contain an "X/Y" pattern, got: "${text}"`);
  }
  return { correct: Number(match[1]), total: Number(match[2]) };
}

/** Reads the current question's data-question-kind attribute (contract v2 + v3). */
export async function currentQuestionKind(page: Page): Promise<QuestionKind> {
  const kind = await questionCard(page).getAttribute('data-question-kind');
  if (!kind || !(ALL_QUESTION_KINDS as readonly string[]).includes(kind)) {
    throw new Error(
      `question-card data-question-kind was not a recognized kind, got: "${kind}". ` +
        `Expected one of: ${ALL_QUESTION_KINDS.join(', ')} per plan.md data-testid contract.`,
    );
  }
  return kind as QuestionKind;
}

/** Reads the current counting-image question's data-count-direction attribute (v3). */
export async function currentCountDirection(page: Page): Promise<CountDirection> {
  const direction = await questionCard(page).getAttribute('data-count-direction');
  if (direction !== 'count-to-image' && direction !== 'image-to-count') {
    throw new Error(
      'Expected a counting-image question to carry data-count-direction ' +
        `"count-to-image" or "image-to-count", got: "${direction}".`,
    );
  }
  return direction;
}

/**
 * Determines correct/incorrect/unknown feedback state from common signal
 * conventions (data-correct, aria-invalid, data-state, class name) applied
 * to an element after answering. These are implementation conventions, not
 * user-facing copy, so they hold even though all displayed copy is
 * Vietnamese per AC10. Returns 'unknown' if no signal is recognized, which
 * callers should treat as a failure rather than guessing.
 */
async function readElementOutcome(element: Locator): Promise<AnswerOutcome> {
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

/** Same as readElementOutcome, but treats a not-yet-disabled option as 'neutral' (unanswered). */
export async function readOptionOutcome(option: Locator): Promise<AnswerOutcome> {
  const disabled = await option.isDisabled();
  if (!disabled) return 'neutral';
  return readElementOutcome(option);
}

export interface ImageChoiceResult {
  clickedOutcome: AnswerOutcome;
  correctIndex: number;
}

/**
 * Clicks the option at optionIndex, waits for the immediate feedback state
 * (AC4: options become disabled after selection), then scans ALL options to
 * find the one showing 'correct' feedback. Per AC4 the correct answer is
 * always revealed after any selection, so this works whether the clicked
 * option was right or wrong. Structurally shared by `image-choice` and the
 * v3 `counting-image` kind, which reuses the same option-{index} 4-option
 * shell (plan.md v3 "New Question Kind: counting-image").
 */
export async function answerImageChoice(page: Page, optionIndex: number): Promise<ImageChoiceResult> {
  const options = optionButtons(page);
  const chosen = options.nth(optionIndex);
  await chosen.click();

  await expect(options.first()).toBeDisabled();

  const count = await options.count();
  let correctIndex = -1;
  for (let i = 0; i < count; i++) {
    const outcome = await readOptionOutcome(options.nth(i));
    if (outcome === 'correct') {
      correctIndex = i;
      break;
    }
  }

  if (correctIndex === -1) {
    throw new Error(
      'Could not find a "correct" feedback signal on any option after answering an option-based question ' +
        '(image-choice or counting-image). AC4/AC12/AC13 require the correct option to be revealed after any ' +
        'selection. Check readElementOutcome() signal patterns against the current implementation.',
    );
  }

  const clickedOutcome = await readOptionOutcome(chosen);
  return { clickedOutcome, correctIndex };
}

/**
 * Extracts the vocabulary word revealed in answer-feedback copy. Per AC10,
 * English is confined to question content (target word, options, spoken
 * utterance) while all instructional/explanation copy is Vietnamese, so the
 * plain-ASCII alphabetic token(s) in the feedback text identify the target
 * word without ever hardcoding a vocabulary list. The longest ASCII token is
 * used, since actual vocabulary words (e.g. "elephant") are the only
 * multi-letter ASCII content expected in an otherwise-Vietnamese sentence.
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

export interface ListeningSubmitResult {
  outcome: AnswerOutcome;
  correctWord: string;
  feedbackText: string;
}

export async function playAudio(page: Page): Promise<void> {
  await page.getByTestId('play-audio-button').click();
}

/**
 * Types guess into answer-input and submits (via submit-answer-button, or
 * Enter key when method is 'enter'), then reads answer-feedback. The
 * feedback element always contains the correct word regardless of outcome
 * (contract v2), which is how the answer key is discovered without ever
 * hardcoding vocabulary content.
 */
export async function submitListeningAnswer(
  page: Page,
  guess: string,
  method: 'button' | 'enter' = 'button',
): Promise<ListeningSubmitResult> {
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
 * purely by diffing DOM content against the app's own revealed answer, the
 * same no-hardcoded-vocabulary principle used everywhere else in this file
 * (never assumes which letter or position is extra ahead of time).
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
      'letter-tile-{index} elements (plan.md v3).',
  );
}

export interface ExtraLetterResult {
  outcome: AnswerOutcome;
  correctWord: string;
  correctTileIndex: number;
  feedbackText: string;
}

/**
 * Clicks the tile at tileIndex, then reads answer-feedback (which per
 * plan.md v3 always reveals the correct word regardless of outcome) and
 * computes which tile index was actually the extra letter by diffing the
 * tiles' rendered letters against that revealed word. The outcome is
 * derived from that comparison (clicked index === computed correct index)
 * rather than from guessing at CSS/styling conventions the extra-letter
 * kind may not share with the option-based kinds.
 */
export async function answerExtraLetter(page: Page, tileIndex: number): Promise<ExtraLetterResult> {
  const tiles = letterTiles(page);
  const tileLetters = await readLetterTileTexts(tiles);
  await tiles.nth(tileIndex).click();

  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible();
  const feedbackText = (await feedback.innerText()).trim();
  const correctWord = extractRevealedWord(feedbackText);
  const correctTileIndex = findExtraLetterTileIndex(tileLetters, correctWord);
  const outcome: AnswerOutcome = correctTileIndex === tileIndex ? 'correct' : 'incorrect';

  return { outcome, correctWord, correctTileIndex, feedbackText };
}

/** A discovered answer key for one question, tagged by kind. */
export type QuestionAnswerKey =
  | { kind: 'image-choice'; correctIndex: number }
  | { kind: 'counting-image'; correctIndex: number }
  | { kind: 'listening-fill-blank'; correctWord: string }
  | { kind: 'extra-letter'; correctTileIndex: number; correctWord: string };

/**
 * Answers the current question with a guaranteed-non-matching guess (a
 * digits-only string for listening, tile/option 0 for the option-based
 * kinds, tile 0 for extra-letter), then records the revealed correct
 * answer. Used for discovery passes: the session must be replayed (Practice
 * Again, or a fresh session for a first-time scan) to actually score using
 * the discovered key, since options/tiles/input lock immediately after one
 * answer.
 */
export async function discoverCurrentQuestionAnswer(page: Page): Promise<QuestionAnswerKey> {
  const kind = await currentQuestionKind(page);

  if (kind === 'image-choice' || kind === 'counting-image') {
    const { correctIndex } = await answerImageChoice(page, 0);
    return { kind, correctIndex };
  }

  if (kind === 'extra-letter') {
    const { correctTileIndex, correctWord } = await answerExtraLetter(page, 0);
    return { kind, correctTileIndex, correctWord };
  }

  await playAudio(page);
  const { correctWord } = await submitListeningAnswer(page, '0000');
  return { kind, correctWord };
}

export interface AnswerAttemptResult {
  outcome: AnswerOutcome;
  revealedWord: string;
  feedbackText: string;
}

/**
 * Answers the current question using a previously discovered key, either
 * matching it (intent 'correct') or deliberately deviating from it (intent
 * 'incorrect'). feedbackText carries the visible explanation/reveal content
 * so callers can assert an explanation was shown without hardcoding its
 * wording. For extra-letter, the "incorrect" tile is computed as
 * `(correctTileIndex + 1) % tileCount`, the same guaranteed-not-correct
 * pattern already used for image-choice/counting-image options, so the
 * clicked tile is deterministically NOT the extra letter.
 */
export async function answerCurrentQuestionWithKey(
  page: Page,
  key: QuestionAnswerKey,
  intent: 'correct' | 'incorrect',
): Promise<AnswerAttemptResult> {
  const kind = await currentQuestionKind(page);
  if (kind !== key.kind) {
    throw new Error(
      `Question kind changed between discovery and replay passes: expected "${key.kind}", got "${kind}". ` +
        'Practice Again may not be preserving question order between sessions.',
    );
  }

  if (key.kind === 'image-choice' || key.kind === 'counting-image') {
    const chosenIndex = intent === 'correct' ? key.correctIndex : (key.correctIndex + 1) % 4;
    const { clickedOutcome } = await answerImageChoice(page, chosenIndex);
    const feedbackText = (await questionCard(page).innerText()).trim();
    return { outcome: clickedOutcome, revealedWord: '', feedbackText };
  }

  if (key.kind === 'extra-letter') {
    const tileCount = await letterTiles(page).count();
    const chosenIndex = intent === 'correct' ? key.correctTileIndex : (key.correctTileIndex + 1) % tileCount;
    const result = await answerExtraLetter(page, chosenIndex);
    return { outcome: result.outcome, revealedWord: key.correctWord, feedbackText: result.feedbackText };
  }

  await playAudio(page);
  const guess = intent === 'correct' ? key.correctWord : `${key.correctWord}notthesameword`;
  const { outcome, feedbackText } = await submitListeningAnswer(page, guess);
  return { outcome, revealedWord: key.correctWord, feedbackText };
}

export async function goToNextQuestion(page: Page): Promise<void> {
  await page.getByTestId('next-button').click();
}

export async function clickPracticeAgain(page: Page): Promise<void> {
  await page.getByTestId('practice-again-button').click();
}

export async function clickChooseAnotherTopic(page: Page): Promise<void> {
  await page.getByTestId('choose-topic-button').click();
}

/** Starts a session from the grade selection screen. */
export async function startSession(page: Page, gradeIndex = 0, topicIndex = 0): Promise<void> {
  await page.goto('/');
  await selectGrade(page, gradeIndex);
  await selectTopic(page, topicIndex);
}

export interface TopicKindScanResult {
  topicIndex: number;
  kinds: Set<QuestionKind>;
  keys: QuestionAnswerKey[];
}

/**
 * Starts a fresh session for the given topic and scans every question's
 * kind via a discovery pass (answers each minimally to advance and records
 * both the kind and the discovered answer key for every question). Leaves
 * the page on the result summary screen after scanning, so callers that
 * want to replay this exact topic's session can immediately call
 * clickPracticeAgain(page).
 */
export async function scanTopicQuestionKinds(page: Page, topicIndex: number): Promise<TopicKindScanResult> {
  await startSession(page, 0, topicIndex);

  const { total } = await readQuestionProgress(page);
  const kinds = new Set<QuestionKind>();
  const keys: QuestionAnswerKey[] = [];

  for (let q = 1; q <= total; q++) {
    const key = await discoverCurrentQuestionAnswer(page);
    kinds.add(key.kind);
    keys.push(key);
    await goToNextQuestion(page);
  }

  await expect(page.getByTestId('score-summary')).toBeVisible();
  return { topicIndex, kinds, keys };
}

/**
 * Tries topics in index order (starting at 0) until one is found whose
 * session includes the given kind. Never assumes which topic indices are
 * countable/eligible for a given kind (plan.md v3 explicitly forbids
 * assuming which topics support counting-image) -- this discovers it by
 * actually running each topic's session and inspecting the kinds
 * encountered, per AC15 ("every topic's session includes every kind that
 * topic is eligible for", so a single pass per topic is sufficient, no
 * retries needed per topic).
 */
export async function findTopicWithQuestionKind(
  page: Page,
  targetKind: QuestionKind,
  maxTopicsToTry: number,
): Promise<TopicKindScanResult> {
  for (let topicIndex = 0; topicIndex < maxTopicsToTry; topicIndex++) {
    const result = await scanTopicQuestionKinds(page, topicIndex);
    if (result.kinds.has(targetKind)) {
      return result;
    }
  }
  throw new Error(
    `No topic among the first ${maxTopicsToTry} contained a "${targetKind}" question. ` +
      'Per plan.md AC15, every topic eligible for a kind must include it in every session; ' +
      'either no topic in range is eligible, or generation for this kind is missing.',
  );
}
