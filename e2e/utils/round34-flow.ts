import { type Page, expect } from '@playwright/test';
import { currentQuestionKind, goToNextQuestion, readQuestionProgress } from './practice-flow';
import { type DescriptionType, answerOptionQuestion, currentDescriptionType, optionButtons } from './option-flow';

/**
 * Round 3 (pronunciation-recording) and Round 4 (describe-and-choose-image)
 * batch-level runners, split out of batch-flow.ts to keep both files under
 * the project's ~200-line file-size guideline. See batch-flow.ts's file doc
 * comment for the overall Batch/Round model these plug into.
 *
 * These helpers were written from plan.md's v5/v6 spec sections BEFORE a
 * real implementation existed for either round (Round 3 and Round 4 were
 * being built by other agents in parallel, sequentially per plan.md v6
 * "Build Scope: Build Round 3 and Round 4 sequentially, not in parallel").
 * If the real implementation's exact DOM/behavior differs from what these
 * assume, these helpers -- not the spec they were written against -- are
 * the ones that need revision. See each helper's own doc comment for its
 * specific assumptions.
 */

const ROUND3_FALLBACK_TIMEOUT_MS = 10_000;

export type Round3FallbackKind = 'mic-permission-denied' | 'speech-recognition-unsupported';

/**
 * Advances past ONE Round 3 (pronunciation-recording) question when the
 * test's browser environment forces a fallback path -- either
 * mic-permission-denied or speech-recognition-unsupported (plan.md v5 Round
 * 3 "Required handling", AC19). Headless Chromium has no real microphone,
 * so every Round 3 E2E scenario in this suite goes through one of these two
 * fallback paths rather than a real recording/transcription.
 *
 * ASSUMPTIONS (Round 3 did not have a real implementation yet when this was
 * written -- see round3-pronunciation-recording.spec.ts's file doc comment
 * for the full disclosure):
 * - Clicking record-button is what triggers the mic-permission /
 *   SpeechRecognition-support check (best-effort: if record-button is
 *   already absent/disabled because the app detected the condition on
 *   render instead, the click is skipped rather than failing).
 * - Once the fallback message renders, plan.md's "allow skipping the round
 *   or falling back to a simpler ... self-check" is exposed via the same
 *   next-button used by every other question kind (QuestionCard's shared
 *   shell), becoming enabled once the fallback state is reached.
 *
 * If the real implementation works differently, this helper is what needs
 * updating, not necessarily the assertions built on top of it.
 */
export async function advanceRound3FallbackQuestion(page: Page, expectedFallback: Round3FallbackKind): Promise<void> {
  const fallbackTestId =
    expectedFallback === 'mic-permission-denied' ? 'mic-permission-denied-message' : 'speech-recognition-unsupported-message';

  const recordButton = page.getByTestId('record-button');
  const recordButtonVisible = await recordButton.isVisible().catch(() => false);
  if (recordButtonVisible) {
    await recordButton.click().catch(() => {
      // Best-effort: if record-button is visible but disabled/unclickable
      // because the fallback was already detected on render, this is a
      // no-op rather than a hard failure.
    });
  }

  await expect(
    page.getByTestId(fallbackTestId),
    `expected ${fallbackTestId} to become visible on this pronunciation-recording question under the simulated ` +
      `${expectedFallback} condition (plan.md v5 AC19)`,
  ).toBeVisible({ timeout: ROUND3_FALLBACK_TIMEOUT_MS });

  // The fallback message alone does not answer the question - the engineer's
  // implementation requires an explicit "Bo qua cau nay" (skip) click
  // (data-testid="pronunciation-skip-button") to actually submit an empty
  // attempt and mark the question answered. This testid was not part of
  // plan.md's original Round 3 contract (record-button, recording-indicator,
  // pronunciation-feedback, mic-permission-denied-message,
  // speech-recognition-unsupported-message only), so this helper originally
  // had no way to know about it and waited for next-button to become enabled
  // on its own, which never happened - fixed by clicking the real skip
  // affordance here.
  await page.getByTestId('pronunciation-skip-button').click();

  const nextButton = page.getByTestId('next-button');
  await expect(
    nextButton,
    `expected next-button to become enabled once ${fallbackTestId} rendered, so the Batch is not blocked by a ` +
      'Round 3 fallback state (plan.md v5 Round 3: "allow skipping the round or falling back to a simpler ' +
      '\'did you attempt it\' self-check")',
  ).toBeEnabled({ timeout: ROUND3_FALLBACK_TIMEOUT_MS });
  await nextButton.click();
}

/**
 * Runs an entire Round 3 (pronunciation-recording) using the forced
 * fallback path identified by expectedFallback, from the first question
 * through to round-score-summary. See advanceRound3FallbackQuestion for the
 * documented assumptions this relies on.
 */
export async function runPronunciationRecordingRoundFallback(
  page: Page,
  expectedFallback: Round3FallbackKind,
): Promise<{ totalQuestions: number }> {
  const { total } = await readQuestionProgress(page);

  for (let q = 1; q <= total; q++) {
    const progress = await readQuestionProgress(page);
    expect(progress.current, `expected question ${q} of Round 3`).toBe(q);
    await currentQuestionKind(page, 'pronunciation-recording');
    await advanceRound3FallbackQuestion(page, expectedFallback);
  }

  await expect(page.getByTestId('round-score-summary')).toBeVisible();
  return { totalQuestions: total };
}

export interface DescribeAndChooseImageRunResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  descriptionTypeCounts: Record<DescriptionType, number>;
  /**
   * The first (Unicode-codepoint-aware) character of the correct option's
   * rendered text for every question, in order -- an object-identity signal
   * used by round-topic-spread.spec.ts as an indirect AC23 diversity proxy.
   * See that spec file's doc comment for why this is a proxy, not a direct
   * topicId check.
   */
  correctOptionEmojis: string[];
  firstIncorrectExample: {
    questionNumber: number;
    descriptionType: DescriptionType;
    clickedIndex: number;
    correctIndex: number;
  } | null;
}

/**
 * Runs an entire Round 4 (describe-and-choose-image) from its first
 * question through to round-score-summary. Clicks option index 0 on every
 * question (a structural choice, never a hardcoded content assumption) and
 * tallies the REAL outcome via answerOptionQuestion, which itself enforces
 * the "exactly one correct option" invariant (plan.md v5 Round 4 Negation
 * Design, AC20) on every question it answers.
 */
export async function runDescribeAndChooseImageRound(
  page: Page,
  options: { clickIndex?: number } = {},
): Promise<DescribeAndChooseImageRunResult> {
  const { clickIndex = 0 } = options;
  const { total } = await readQuestionProgress(page);
  let correctCount = 0;
  let incorrectCount = 0;
  const descriptionTypeCounts: Record<DescriptionType, number> = { count: 0, negation: 0 };
  const correctOptionEmojis: string[] = [];
  let firstIncorrectExample: DescribeAndChooseImageRunResult['firstIncorrectExample'] = null;

  for (let q = 1; q <= total; q++) {
    const progress = await readQuestionProgress(page);
    expect(progress.current, `expected question ${q} of Round 4`).toBe(q);
    await currentQuestionKind(page, 'describe-and-choose-image');
    const descriptionType = await currentDescriptionType(page);
    descriptionTypeCounts[descriptionType]++;

    const result = await answerOptionQuestion(page, clickIndex);
    if (result.outcome === 'correct') {
      correctCount++;
    } else if (result.outcome === 'incorrect') {
      incorrectCount++;
      if (!firstIncorrectExample) {
        firstIncorrectExample = {
          questionNumber: q,
          descriptionType,
          clickedIndex: result.clickedIndex,
          correctIndex: result.correctIndex,
        };
      }
    } else {
      throw new Error(`Round 4 question ${q}: unrecognized answer outcome`);
    }

    const correctOptionText = (await optionButtons(page).nth(result.correctIndex).innerText()).trim();
    const [firstChar] = Array.from(correctOptionText);
    correctOptionEmojis.push(firstChar ?? '');

    await goToNextQuestion(page);
  }

  await expect(page.getByTestId('round-score-summary')).toBeVisible();
  return {
    totalQuestions: total,
    correctCount,
    incorrectCount,
    descriptionTypeCounts,
    correctOptionEmojis,
    firstIncorrectExample,
  };
}
