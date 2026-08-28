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
 * Batch/Round navigation helpers for the v5 interaction model
 * (plans/260827-student-self-practice-site/plan.md, "v5 - Batch/Round
 * Restructure" section, "Data-Testid Contract Additions"). Replaces the old
 * topic-select -> mixed-kind-session -> score-summary flow entirely: this
 * build has no topic selection step, the flow is
 * Grade -> Start a Batch -> Round 1..4 -> Batch summary.
 *
 * A Batch is exactly 4 fixed-order Rounds (AC17). Only Round 1
 * (extra-letter) and Round 2 (listening-sentence-fill-blank) have real
 * question content in this build phase; Round 3 and Round 4 are explicit
 * stubs. This file's stub-round helper deliberately does not assume any
 * particular stub UI shape -- see advancePastRound() below.
 */

const STUB_ROUND_TIMEOUT_MS = 10_000;

/** Starts a batch from a fresh page load: grade selection -> Start a Batch. */
export async function startBatch(page: Page, gradeIndex = 0): Promise<void> {
  await page.goto('/');
  await selectGrade(page, gradeIndex);
  await page.getByTestId('start-batch-button').click();
  await expect(page.getByTestId('round-progress')).toBeVisible();
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

export type RoundStubAdvanceOutcome = 'advanced-to-next-round' | 'reached-batch-summary';

/**
 * Advances past a Round that is a content-less stub in this build phase
 * (Round 3 pronunciation-recording, Round 4 describe-and-choose-image --
 * see plan.md v5, not yet implemented). The exact stub UI shape is
 * deliberately NOT assumed (it may show round-score-summary immediately, or
 * expose next-round-button directly with no summary, or skip straight to
 * batch-score-summary if this is the last round) -- this function races for
 * whichever of those becomes visible first and reacts accordingly, and
 * throws a clear, non-silent error if none of them appear within a generous
 * timeout, per the instruction to surface a genuinely blocked flow rather
 * than working around it.
 */
export async function advancePastRoundStub(page: Page, roundLabel: string): Promise<RoundStubAdvanceOutcome> {
  const batchSummary = page.getByTestId('batch-score-summary');
  const roundSummary = page.getByTestId('round-score-summary');
  const nextRoundButton = page.getByTestId('next-round-button');

  const raceResult = await Promise.race([
    batchSummary
      .waitFor({ state: 'visible', timeout: STUB_ROUND_TIMEOUT_MS })
      .then(() => 'batch-summary' as const)
      .catch(() => null),
    roundSummary
      .waitFor({ state: 'visible', timeout: STUB_ROUND_TIMEOUT_MS })
      .then(() => 'round-summary' as const)
      .catch(() => null),
    nextRoundButton
      .waitFor({ state: 'visible', timeout: STUB_ROUND_TIMEOUT_MS })
      .then(() => 'next-round-button' as const)
      .catch(() => null),
  ]);

  if (raceResult === null) {
    throw new Error(
      `${roundLabel}: none of batch-score-summary, round-score-summary, or next-round-button became visible ` +
        `within ${STUB_ROUND_TIMEOUT_MS}ms. This stub round appears to block the Batch from ever reaching a ` +
        'summary screen -- this is a real app-behavior finding to fix, not a test-technique problem to route around.',
    );
  }

  if (raceResult === 'batch-summary') {
    return 'reached-batch-summary';
  }

  // round-summary and/or next-round-button is visible; either way,
  // next-round-button is the documented affordance to proceed.
  await expect(nextRoundButton).toBeVisible({ timeout: STUB_ROUND_TIMEOUT_MS });
  await nextRoundButton.click();

  // Do NOT race against `round-progress` becoming visible here: BatchScreen
  // renders RoundProgress on every phase except 'batch-summary' (including
  // the stub phase we just clicked past), so it is already visible before
  // this click too and Playwright's waitFor resolves near-instantly against
  // that stale element, before the real post-click render ever happens -
  // that previously made this helper misreport 'advanced-to-next-round' even
  // when the app had genuinely reached the Batch summary. Waiting solely for
  // batch-summary (with a real timeout, not an instant race) and treating a
  // timeout as "did not reach it yet" is the reliable signal.
  const reachedSummary = await batchSummary
    .waitFor({ state: 'visible', timeout: STUB_ROUND_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);

  if (reachedSummary) {
    return 'reached-batch-summary';
  }

  // Confirm the app actually moved on to something (a new round or another
  // stub) rather than silently doing nothing - fail loudly if not.
  // RoundProgress renders on every non-batch-summary phase, so its continued
  // presence is sufficient evidence the app is still rendering a round (as
  // opposed to a blank/crashed screen), without the earlier race's flaw of
  // treating "still visible from before" as "just became visible".
  await expect(page.getByTestId('round-progress')).toBeVisible({ timeout: STUB_ROUND_TIMEOUT_MS });

  return 'advanced-to-next-round';
}

export type { AnswerOutcome };
