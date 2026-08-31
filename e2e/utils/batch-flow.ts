import { type Page, expect } from '@playwright/test';
import {
  type AnswerOutcome,
  type Fraction,
  answerExtraLetterTile,
  currentQuestionKind,
  goToNextQuestion,
  parseFraction,
  playAudio,
  readQuestionProgress,
  selectGrade,
  submitListeningAnswer,
} from './practice-flow';

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

  for (let q = 1; q <= total; q++) {
    const progress = await readQuestionProgress(page);
    expect(progress.current, `expected question ${q} of Round 1`).toBe(q);
    await currentQuestionKind(page, 'extra-letter');

    const result = await answerExtraLetterTile(page, 0);
    revealedWords.push(result.correctWord);
    if (result.outcome === 'correct') correctCount++;
    else if (result.outcome === 'incorrect') incorrectCount++;
    else throw new Error(`Round 1 question ${q}: unrecognized answer outcome`);

    await goToNextQuestion(page);
  }

  await expect(page.getByTestId('round-score-summary')).toBeVisible();
  return { totalQuestions: total, correctCount, incorrectCount, revealedWords };
}

export interface ListeningRoundOptions {
  /** If true (default), exercises play-audio-button (incl. "listen again") on the first question. */
  verifyAudioResilience?: boolean;
}

/**
 * Runs an entire Round 2 (listening-sentence-fill-blank) using a
 * guaranteed-wrong-then-discover technique: submits a digits-only guess
 * (structurally impossible to match any real English word) on every
 * question, which is always marked incorrect but still reveals the correct
 * word via answer-feedback (same reveal-after-any-interaction principle as
 * Round 1). This never risks an accidental correct guess and never
 * hardcodes any sentence/vocabulary content. Because every answer is
 * deliberately wrong, the expected round tally is 0 correct out of total --
 * callers should assert that against round-score-summary.
 */
export async function runListeningSentenceRound(
  page: Page,
  options: ListeningRoundOptions = {},
): Promise<RoundRunResult & { pageErrors: Error[] }> {
  const { verifyAudioResilience = true } = options;
  const { total } = await readQuestionProgress(page);
  const revealedWords: string[] = [];
  const pageErrors: Error[] = [];
  const onPageError = (error: Error) => pageErrors.push(error);
  page.on('pageerror', onPageError);

  try {
    for (let q = 1; q <= total; q++) {
      const progress = await readQuestionProgress(page);
      expect(progress.current, `expected question ${q} of Round 2`).toBe(q);
      await currentQuestionKind(page, 'listening-sentence-fill-blank');

      if (verifyAudioResilience && q === 1) {
        // Exercise play (and "listen again") on the first question; headless
        // Chromium may have zero TTS voices, but the call must never throw
        // or freeze the page (plan.md AC5/Round 2's audio-resilience carryover).
        await playAudio(page);
        await playAudio(page);
      }

      const result = await submitListeningAnswer(page, '0000');
      expect(result.outcome, `Round 2 question ${q}: guaranteed-wrong guess must be marked incorrect`).toBe(
        'incorrect',
      );
      revealedWords.push(result.correctWord);

      await goToNextQuestion(page);
    }

    await expect(page.getByTestId('round-score-summary')).toBeVisible();
  } finally {
    page.off('pageerror', onPageError);
  }

  return { totalQuestions: total, correctCount: 0, incorrectCount: total, revealedWords, pageErrors };
}

export type { AnswerOutcome };
