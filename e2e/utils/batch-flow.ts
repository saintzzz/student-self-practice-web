import { type Locator, type Page, expect } from '@playwright/test';
import {
  type AnswerOutcome,
  type Fraction,
  type RoundQuestionKind,
  answerExtraLetterTile,
  currentQuestionKind,
  currentQuestionKindOneOf,
  goToNextQuestion,
  parseFraction,
  playAudio,
  questionCard,
  readQuestionProgress,
  selectGrade,
  submitListeningAnswer,
} from './practice-flow';
import { answerOptionQuestion, optionButtons } from './option-flow';

/**
 * Batch/Round navigation and Round 1/Round 2 runners for the v5/v6
 * interaction model (plans/260827-student-self-practice-site/plan.md, "v5 -
 * Batch/Round Restructure" and "v6 - Round 3 + Round 4 Real Implementation"
 * sections, "Data-Testid Contract Additions"). Replaces the old topic-select
 * -> mixed-kind-session -> score-summary flow entirely: this build has no
 * topic selection step, the flow is
 * Grade -> Start a Batch -> Round 1..4 -> Batch summary.
 *
 * A Batch is exactly 4 fixed-order Rounds (AC17): extra-letter,
 * listening-sentence-fill-blank, pronunciation-recording,
 * describe-and-choose-image. Round 3/Round 4's own runners
 * (runPronunciationRecordingRoundFallback, runDescribeAndChooseImageRound)
 * live in ./round34-flow.ts, split out to keep this file under the
 * project's ~200-line file-size guideline.
 */

/** Starts a batch from a fresh page load: grade selection -> Start a Batch. */
export async function startBatch(page: Page, gradeIndex = 0): Promise<void> {
  await page.goto('/');
  await selectGrade(page, gradeIndex);
  await page.getByTestId('start-batch-button').click();
  await expect(page.getByTestId('round-progress')).toBeVisible();
}

/**
 * Starts a fresh Batch and drives all the way through Round 1
 * (extra-letter) and Round 2 (listening-sentence-fill-blank) to land on
 * Round 3's first question, without re-asserting Round 1/2's own behavior
 * in depth (that is round1-extra-letter.spec.ts / round2-listening-sentence
 * .spec.ts's job). Used by Round 3/Round 4 specs that only need to reach
 * their round quickly. The explicit goToNextRound() call after each round
 * runner is required -- the round runners stop at that round's
 * round-score-summary without auto-advancing.
 */
export async function fastForwardThroughRounds1And2(page: Page): Promise<void> {
  await startBatch(page);
  await runExtraLetterRound(page);
  await goToNextRound(page);
  await runListeningSentenceRound(page, { verifyAudioResilience: false });
  await goToNextRound(page);
}

export async function readRoundProgress(page: Page): Promise<Fraction> {
  const text = (await page.getByTestId('round-progress').textContent()) ?? '';
  return parseFraction(text, 'round-progress');
}

export async function readRoundScoreSummary(page: Page): Promise<Fraction> {
  const text = (await page.getByTestId('round-score-summary').textContent()) ?? '';
  return parseFraction(text, 'round-score-summary');
}

export async function readBatchScoreSummary(page: Page): Promise<Fraction> {
  const text = (await page.getByTestId('batch-score-summary').textContent()) ?? '';
  return parseFraction(text, 'batch-score-summary');
}

export async function goToNextRound(page: Page): Promise<void> {
  await page.getByTestId('next-round-button').click();
}

export interface RoundRunResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  revealedWords: string[];
}

/**
 * Runs an entire Round 1 (extra-letter) from its first question through to
 * round-score-summary. Clicks tile index 0 on every question -- a
 * structural choice (first rendered tile), never a hardcoded vocabulary
 * assumption -- and tallies the REAL outcome of each click (sometimes
 * correct, sometimes not, depending on where the extra letter actually
 * falls) using the same-interaction reveal (answer-feedback always shows
 * the correct word regardless of outcome). The tally is later compared
 * against round-score-summary to verify scoring accuracy, never against a
 * hardcoded expected score.
 */
export async function runExtraLetterRound(page: Page): Promise<RoundRunResult> {
  const { total } = await readQuestionProgress(page);
  let correctCount = 0;
  let incorrectCount = 0;
  const revealedWords: string[] = [];
  const kindCounts = { 'extra-letter': 0, 'image-choice': 0 };

  for (let q = 1; q <= total; q++) {
    const progress = await readQuestionProgress(page);
    expect(progress.current, `expected question ${q} of Round 1`).toBe(q);
    // PRD r3 / D-10: Round 1 shuffles 7 extra-letter + 3 image-choice.
    const kind = (await currentQuestionKindOneOf(page, ['extra-letter', 'image-choice'])) as
      | 'extra-letter'
      | 'image-choice';
    kindCounts[kind]++;

    if (kind === 'extra-letter') {
      const result = await answerExtraLetterTile(page, 0);
      revealedWords.push(result.correctWord);
      if (result.outcome === 'correct') correctCount++;
      else if (result.outcome === 'incorrect') incorrectCount++;
      else throw new Error(`Round 1 question ${q}: unrecognized answer outcome`);
    } else {
      // image-choice: structural click on option 0, then discover the real
      // outcome and the correct word from post-answer state (same technique
      // as the listening-image-choice branch in runListeningSentenceRound).
      const result = await answerOptionQuestion(page, 0);
      if (result.outcome === 'correct') correctCount++;
      else incorrectCount++;
      const correctOptionText = (
        await optionButtons(page).nth(result.correctIndex).innerText()
      ).trim();
      revealedWords.push(correctOptionText);
    }

    await goToNextQuestion(page);
  }

  await expect(page.getByTestId('round-score-summary')).toBeVisible();
  // AC-9.1: the mixed composition must hold for every batch seed.
  expect(kindCounts['extra-letter'], 'Round 1 must contain exactly 7 extra-letter questions').toBe(7);
  expect(kindCounts['image-choice'], 'Round 1 must contain exactly 3 image-choice questions').toBe(3);
  return { totalQuestions: total, correctCount, incorrectCount, revealedWords };
}

export interface ListeningRoundOptions {
  /** If true (default), exercises play-audio-button (incl. "listen again") on the first question. */
  verifyAudioResilience?: boolean;
}

export type ListeningRoundKindCounts = Record<'listening-sentence-fill-blank' | 'listening-image-choice', number>;

export interface ListeningRoundResult extends RoundRunResult {
  pageErrors: Error[];
  /** How many of each Round 2 kind were actually seen (plan.md v8 AC30). */
  kindCounts: ListeningRoundKindCounts;
}

/**
 * Runs an entire Round 2, branching per question kind (plan.md v8 "Round 2
 * Addition: Listening Image-Choice" / AC30 -- Round 2's pool now mixes
 * listening-sentence-fill-blank and listening-image-choice):
 * - listening-sentence-fill-blank: guaranteed-wrong-then-discover technique
 *   (a digits-only guess is structurally impossible to match any real
 *   English word), always marked incorrect but still reveals the correct
 *   word via answer-feedback (same reveal-after-any-interaction principle as
 *   Round 1).
 * - listening-image-choice: no typing is possible for a click-based option
 *   shell, so this branch clicks option index 0 (a structural choice, never
 *   a hardcoded content assumption) and discovers the REAL outcome from the
 *   app's own post-answer styling signal (same technique as Round 4's
 *   answerOptionQuestion, reused here from option-flow.ts). This can be
 *   correct or incorrect for real, unlike the fill-blank branch -- callers
 *   must compare correctCount/incorrectCount against round-score-summary's
 *   REAL observed tally, not assume 0.
 *
 * Never hardcodes any sentence/vocabulary content. play-audio-button is
 * exercised once (on the first question seen, whichever kind it is) since
 * plan.md v8 notes listening-image-choice "likely" reuses it too -- if the
 * real implementation does not render play-audio-button for
 * listening-image-choice, this call throws, which is a real signal worth
 * investigating, not a technique bug.
 */
export async function runListeningSentenceRound(
  page: Page,
  options: ListeningRoundOptions = {},
): Promise<ListeningRoundResult> {
  const { verifyAudioResilience = true } = options;
  const { total } = await readQuestionProgress(page);
  const revealedWords: string[] = [];
  const pageErrors: Error[] = [];
  const kindCounts: ListeningRoundKindCounts = { 'listening-sentence-fill-blank': 0, 'listening-image-choice': 0 };
  let correctCount = 0;
  let incorrectCount = 0;
  const onPageError = (error: Error) => pageErrors.push(error);
  page.on('pageerror', onPageError);

  try {
    let audioExercised = false;
    for (let q = 1; q <= total; q++) {
      const progress = await readQuestionProgress(page);
      expect(progress.current, `expected question ${q} of Round 2`).toBe(q);
      const kind = (await currentQuestionKindOneOf(page, [
        'listening-sentence-fill-blank',
        'listening-image-choice',
      ])) as keyof ListeningRoundKindCounts;
      kindCounts[kind]++;

      if (verifyAudioResilience && !audioExercised) {
        audioExercised = true;
        // Exercise play (and "listen again") on the first question; headless
        // Chromium may have zero TTS voices, but the call must never throw
        // or freeze the page (plan.md AC5/Round 2's audio-resilience carryover).
        await playAudio(page);
        await playAudio(page);
      }

      if (kind === 'listening-sentence-fill-blank') {
        const result = await submitListeningAnswer(page, '0000');
        expect(result.outcome, `Round 2 question ${q} (listening-sentence-fill-blank): guaranteed-wrong guess must be marked incorrect`).toBe(
          'incorrect',
        );
        incorrectCount++;
        revealedWords.push(result.correctWord);
      } else {
        const result = await answerOptionQuestion(page, 0);
        if (result.outcome === 'correct') correctCount++;
        else incorrectCount++;
        const correctOptionText = (await optionButtons(page).nth(result.correctIndex).innerText()).trim();
        revealedWords.push(correctOptionText);
      }

      await goToNextQuestion(page);
    }

    await expect(page.getByTestId('round-score-summary')).toBeVisible();
  } finally {
    page.off('pageerror', onPageError);
  }

  return { totalQuestions: total, correctCount, incorrectCount, revealedWords, pageErrors, kindCounts };
}

/**
 * Advances within the CURRENT round until a question of `targetKind` is on
 * screen, then returns the question-card locator (allowlist T-5: PRD r3/D-10
 * shuffles 3 image-choice questions into Round 1's 10, and plan.md v8 AC30
 * already mixes two kinds into Round 2's pool). Non-target questions are
 * answered structurally - tile/option index 0 for click kinds, a
 * guaranteed-wrong digits-only guess for listening-sentence-fill-blank -
 * and moved past with next-button, never via hardcoded content.
 *
 * Pronunciation-recording and picture-pair-matching are NOT supported here
 * (they need a mic fallback / pair-tile mechanics); encountering one throws
 * a clear error rather than silently stalling.
 */
export async function advanceToQuestionKind(
  page: Page,
  targetKind: RoundQuestionKind,
  maxAttempts = 10,
): Promise<Locator> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const kind = await questionCard(page).getAttribute('data-question-kind');
    if (kind === targetKind) return questionCard(page);
    switch (kind) {
      case 'extra-letter':
        await answerExtraLetterTile(page, 0);
        break;
      case 'image-choice':
      case 'listening-image-choice':
      case 'counting-image':
      case 'describe-and-choose-image':
        await answerOptionQuestion(page, 0);
        break;
      case 'listening-sentence-fill-blank':
        // Digits-only guess is structurally impossible to match any real
        // English word - always incorrect, still advances (same technique
        // as runListeningSentenceRound above).
        await submitListeningAnswer(page, '0000');
        break;
      default:
        throw new Error(`advanceToQuestionKind: cannot advance past kind "${kind}"`);
    }
    await goToNextQuestion(page);
  }
  throw new Error(
    `advanceToQuestionKind: never reached a "${targetKind}" question within ${maxAttempts} tries ` +
      '(a legitimately-absent kind is a generator signal worth investigating, not a helper bug)',
  );
}

export type { AnswerOutcome };
