import { test, expect } from '@playwright/test';
import { goToNextRound, readBatchScoreSummary, readRoundProgress, runExtraLetterRound, runListeningSentenceRound, startBatch } from './utils/batch-flow';
import { type Fraction, currentQuestionKind, parseFraction, questionCard } from './utils/practice-flow';
import { runDescribeAndChooseImageRound, runPronunciationRecordingRoundFallback } from './utils/round34-flow';

/**
 * Covers plan.md v6 AC24/AC25 (Round 3 and Round 4 are no longer stubs) and
 * the end-to-end AC17/AC21 flow: Grade -> Start a Batch -> Round 1 ->
 * Round 2 -> Round 3 -> Round 4 -> Batch summary, confirming a real
 * question-card renders for every round (never RoundStub's "coming soon"
 * placeholder -- src/components/RoundStub.tsx) and the Batch summary's
 * per-round breakdown reflects real scored totals for all 4 rounds, not the
 * "Chưa có nội dung ở bản này" (no content in this build) placeholder text
 * that src/components/BatchSummary.tsx renders for round.implemented ===
 * false.
 *
 * Round 3 is driven through the forced speech-recognition-unsupported
 * fallback path (same rationale as round3-pronunciation-recording.spec.ts
 * -- headless Chromium cannot supply real mic/transcription), so this test
 * stays deterministic. It is not re-testing Round 3's fallback-message
 * mechanics in depth (that is round3-pronunciation-recording.spec.ts's
 * job) -- only that the round is real: it renders question-card with the
 * right kind and contributes a real (non-zero-total) score to the Batch
 * summary, unlike a stub.
 */
test.describe('Batch/Round: full flow reaches the Batch summary with no stub rounds remaining', () => {
  test('Grade -> Start Batch -> Round 1..4 -> Batch summary, with real content in every round', async ({ page }) => {
    const pageErrors: Error[] = [];
    const onPageError = (error: Error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a browser API -- Round 3 is
      // driven through its unsupported-browser fallback path in this
      // full-flow check (see file doc comment); its own fallback-message
      // mechanics are covered in depth by round3-pronunciation-recording.spec.ts.
      delete window.SpeechRecognition;
      // @ts-expect-error see above
      delete window.webkitSpeechRecognition;
    });

    try {
      await startBatch(page);

      const round1 = await test.step('Round 1 (extra-letter) is real, not a stub', async () => {
        await currentQuestionKind(page, 'extra-letter');
        return runExtraLetterRound(page);
      });
      await goToNextRound(page);

      const round2 = await test.step('Round 2 (listening-sentence-fill-blank) is real, not a stub', async () => {
        await currentQuestionKind(page, 'listening-sentence-fill-blank');
        return runListeningSentenceRound(page, { verifyAudioResilience: false });
      });
      await goToNextRound(page);

      await test.step('Round 3 (pronunciation-recording) renders a real question-card, not RoundStub (AC24)', async () => {
        const roundProgress = await readRoundProgress(page);
        expect(roundProgress.current).toBe(3);
        await expect(questionCard(page)).toBeVisible();
        await expect(questionCard(page)).toHaveAttribute('data-question-kind', 'pronunciation-recording');
      });
      await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
      await goToNextRound(page);

      const round4 = await test.step('Round 4 (describe-and-choose-image) renders a real question-card, not RoundStub (AC25)', async () => {
        const roundProgress = await readRoundProgress(page);
        expect(roundProgress.current).toBe(4);
        await expect(questionCard(page)).toBeVisible();
        await expect(questionCard(page)).toHaveAttribute('data-question-kind', 'describe-and-choose-image');
        return runDescribeAndChooseImageRound(page);
      });

      // Round runners stop at that round's round-score-summary without
      // auto-advancing (the established pattern for every Round in this
      // suite) - this explicit click is required to actually leave Round 4
      // and reach the Batch summary. Missing it here made this test check
      // batch-score-summary while the app was still correctly sitting on
      // Round 4's round-summary screen (same class of bug fixed earlier in
      // the v5 round3-round4-stubs.spec.ts off-by-one).
      await goToNextRound(page);

      await test.step('the Batch summary shows a per-round breakdown with real, parseable scores for all 4 rounds -- no "Chưa có nội dung ở bản này" placeholder left for any round (AC21/AC24/AC25)', async () => {
        await expect(page.getByTestId('batch-score-summary')).toBeVisible();
        const batchScore = await readBatchScoreSummary(page);

        const roundBreakdownFractions: Partial<Record<1 | 2 | 3 | 4, Fraction>> = {};
        for (const roundNumber of [1, 2, 3, 4] as const) {
          const breakdown = page.getByTestId(`round-breakdown-${roundNumber}`);
          await expect(breakdown, `expected round-breakdown-${roundNumber} to be visible on the Batch summary`).toBeVisible();
          const breakdownText = (await breakdown.innerText()).trim();
          try {
            roundBreakdownFractions[roundNumber] = parseFraction(breakdownText, `round-breakdown-${roundNumber}`);
          } catch {
            throw new Error(
              `round-breakdown-${roundNumber} did not contain a parseable "X/Y câu đúng" score fraction (got: ` +
                `"${breakdownText}"). BatchSummary.tsx only renders a score fraction when round.implemented is ` +
                'true; an unimplemented/stub round instead renders "Chưa có nội dung ở bản này" with no fraction. ' +
                'Round 3 and Round 4 must both be real per plan.md v6 AC24/AC25 -- this is a genuine ' +
                'stub-still-present finding, not a test bug.',
            );
          }
        }

        const round3Fraction = roundBreakdownFractions[3]!;
        const expectedTotalQuestions = round1.totalQuestions + round2.totalQuestions + round3Fraction.total + round4.totalQuestions;
        expect(batchScore.total, 'batch-score-summary total question count must sum all 4 real rounds').toBe(expectedTotalQuestions);

        const expectedTotalCorrect = round1.correctCount + round2.correctCount + round3Fraction.current + round4.correctCount;
        expect(batchScore.current, 'batch-score-summary correct count must sum all 4 real rounds').toBe(expectedTotalCorrect);
      });
    } finally {
      page.off('pageerror', onPageError);
    }

    await test.step('no uncaught page errors occurred anywhere across the full Grade -> Batch -> Round 1-4 -> Batch summary flow', async () => {
      expect(
        pageErrors,
        `page threw uncaught error(s) during the full Batch flow: ${pageErrors.map((error) => error.message).join('; ')}`,
      ).toEqual([]);
    });
  });
});
