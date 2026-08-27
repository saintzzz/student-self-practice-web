import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Shared helpers for driving the Student Self-Practice app during E2E tests.
 * These helpers rely only on the data-testid contract documented in
 * plans/260827-student-self-practice-site/plan.md and never assert on
 * specific question wording or content.
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

export function gradeCards(page: Page): Locator {
  return page.locator('[data-testid^="grade-card-"]');
}

export function topicCards(page: Page): Locator {
  return page.locator('[data-testid^="topic-card-"]');
}

export function optionButtons(page: Page): Locator {
  return page.locator('[data-testid^="option-"]');
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

/**
 * Determines whether an answered option is showing correct, incorrect, or
 * neutral feedback by inspecting common feedback signals (class names,
 * data-state, aria attributes) applied after a selection, per AC4 ("shows
 * correct/incorrect styling ... reveals the correct answer if wrong"). The
 * exact attribute/class naming is not part of the fixed data-testid
 * contract, so this checks several conventional patterns. Returns 'unknown'
 * if no signal is recognized, which callers should treat as a failure
 * rather than silently guessing.
 */
export async function readOptionOutcome(option: Locator): Promise<AnswerOutcome> {
  const [className, dataState, dataCorrect, ariaInvalid, disabled] = await Promise.all([
    option.getAttribute('class'),
    option.getAttribute('data-state'),
    option.getAttribute('data-correct'),
    option.getAttribute('aria-invalid'),
    option.isDisabled(),
  ]);

  if (!disabled) {
    // Not answered yet, no feedback should be present.
    return 'neutral';
  }

  if (dataCorrect === 'true') return 'correct';
  if (dataCorrect === 'false') return 'incorrect';
  if (ariaInvalid === 'true') return 'incorrect';
  if (ariaInvalid === 'false' && dataState === 'answered') return 'correct';

  const haystack = `${className ?? ''} ${dataState ?? ''}`.toLowerCase();
  if (/incorrect|wrong|error|invalid|red-/.test(haystack)) return 'incorrect';
  if (/correct|success|right|green-/.test(haystack)) return 'correct';

  return 'unknown';
}

/**
 * Clicks the option at optionIndex, waits for the immediate feedback state
 * (AC4: options become disabled after selection), then scans ALL options to
 * find the one showing 'correct' feedback. Per AC4 the correct answer is
 * always revealed after any selection, so this works whether the clicked
 * option was right or wrong. Returns the outcome of the clicked option plus
 * the discovered index of the actually-correct option.
 */
export async function answerAndDiscoverCorrectIndex(
  page: Page,
  optionIndex: number,
): Promise<{ clickedOutcome: AnswerOutcome; correctIndex: number }> {
  const options = optionButtons(page);
  const chosen = options.nth(optionIndex);
  await chosen.click();

  // AC4: options become disabled immediately after selection.
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
      'Could not find a "correct" feedback signal on any option after answering. ' +
        'AC4 requires the correct answer to be revealed after any selection. ' +
        'Check readOptionOutcome() signal patterns against the current implementation.',
    );
  }

  const clickedOutcome = await readOptionOutcome(chosen);
  return { clickedOutcome, correctIndex };
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
