import { test, expect } from '@playwright/test';
import {
  startBatch,
  goToNextRound,
  runExtraLetterRound,
  runListeningSentenceRound,
  advancePastRoundStub,
  readBatchScoreSummary,
} from './utils/batch-flow';

/**
 * Covers plan.md v5 AC17/AC21 for the Round 3 (pronunciation-recording) and
 * Round 4 (describe-and-choose-image) transitions, which are explicit
 * content-less stubs in this build phase (plan.md v5's Round 3 / Round 4
 * sections describe real mechanics that are not yet implemented). Per the
 * task scope for this build phase, this spec deliberately does NOT test any
 * real Round 3/4 mechanics (no mic recording, no image-choice content) -- it
 * only verifies the Batch flow can pass through both stub rounds without the
 * page crashing and eventually reach the Batch summary screen (AC21).
 *
 * This test starts its own fresh Batch and is independent of the Round 1
 * and Round 2 specs; it drives through Round 1 and Round 2 quickly using the
 * shared round-runner helpers purely to reach Round 3, without re-asserting
 * their detailed behavior (already covered by round1-extra-letter.spec.ts
 * and round2-listening-sentence.spec.ts).
 *
 * advancePastRoundStub() deliberately does not assume the stub rounds' UI
 * shape -- see its doc comment in ./utils/batch-flow.ts. If a stub round
 * genuinely blocks the flow from ever reaching a round/batch summary or the
 * next-round affordance, this test fails loudly with a descriptive error
 * (rather than silently working around it), which is the desired outcome:
 * a real app-behavior finding must surface, not be hidden.
 */
test.describe('Batch/Round: Round 3 and Round 4 stubs reach the Batch summary', () => {
  test('proceeds through the Round 3 and Round 4 stubs without crashing and shows a Batch summary', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const onPageError = (error: Error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    try {
      await startBatch(page);
      await runExtraLetterRound(page);
      await goToNextRound(page);
      await runListeningSentenceRound(page, { verifyAudioResilience: false });
      // Round runners stop at that round's round-score-summary without
      // auto-advancing (matching the Round 1 pattern above) - this explicit
      // click is required to actually leave Round 2 before the Round 3/4
      // stub checks below. Omitting it made both "advance past" calls below
      // silently operate one round earlier than their labels claimed (Round
      // 2->3 and Round 3->4 instead of Round 3->4 and Round 4->batch
      // summary), so the flow never actually reached the Batch summary.
      await goToNextRound(page);

      let reachedBatchSummary = false;

      await test.step('advance past the Round 3 stub (pronunciation-recording)', async () => {
        const outcome = await advancePastRoundStub(page, 'Round 3 (pronunciation-recording stub)');
        reachedBatchSummary = outcome === 'reached-batch-summary';
      });

      if (!reachedBatchSummary) {
        await test.step('advance past the Round 4 stub (describe-and-choose-image)', async () => {
          const outcome = await advancePastRoundStub(page, 'Round 4 (describe-and-choose-image stub)');
          reachedBatchSummary = outcome === 'reached-batch-summary';
        });
      }

      await test.step('the Batch summary is reached and shows a readable score after Round 4 (AC21)', async () => {
        expect(
          reachedBatchSummary,
          'expected the Batch flow to reach batch-score-summary after Round 3 and Round 4, whether they remain ' +
            'stubs or gain real content later',
        ).toBe(true);
        await expect(page.getByTestId('batch-score-summary')).toBeVisible();
        const batchScore = await readBatchScoreSummary(page);
        expect(batchScore.total).toBeGreaterThan(0);
      });
    } finally {
      page.off('pageerror', onPageError);
    }

    await test.step('no uncaught page errors occurred anywhere in the Batch, including while passing through the Round 3/4 stubs', async () => {
      expect(
        pageErrors,
        `page threw uncaught error(s) during the Batch flow: ${pageErrors.map((error) => error.message).join('; ')}`,
      ).toEqual([]);
    });
  });
});
