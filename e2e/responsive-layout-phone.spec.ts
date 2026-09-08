import { test, expect } from '@playwright/test';
import { startBatch, fastForwardThroughRounds1And2, goToNextRound } from './utils/batch-flow';
import { runPronunciationRecordingRoundFallback } from './utils/round34-flow';
import { advanceToPicturePairMatching, pairTiles, readMistakeCount } from './utils/pair-matching-flow';
import { currentQuestionKind, letterTiles } from './utils/practice-flow';
import {
  PHONE_LANDSCAPE,
  PHONE_PORTRAIT,
  expectFullyInViewport,
  expectNoHorizontalScroll,
  expectWithinReasonableScrollDistance,
} from './utils/viewport-flow';

/**
 * Covers plan.md v9's confirmed responsive-layout regression: at
 * phone-sized viewports, the persistent header stack (round-progress +
 * live-score + round-timer + question-progress) combined with
 * content-heavy questions pushes the answer/Next button below the fold,
 * requiring an undiscoverable scroll. Confirmed worst case: phone
 * landscape (667x375), button fully hidden with no scroll affordance.
 *
 * Written against plan.md v9's spec text BEFORE the engineer's fix (header
 * chrome compaction + ~76px touch-target reconciliation) may have landed --
 * an in-progress build. A failure here reporting an element's box below the
 * viewport bottom is the EXPECTED signal of the regression still being
 * present, not a test bug -- re-run after the fix lands for real pass/fail
 * signal. See plans/reports/tester-260908-student-self-practice-v9-
 * responsive.md for current status.
 *
 * Never hardcodes vocabulary/sentence content -- reuses the existing
 * discover-the-answer-from-revealed-state technique via batch-flow.ts /
 * pair-matching-flow.ts. Each test starts its own fresh Batch and is
 * independent of every other test in this file and every other spec file.
 */

/** A single reasonable scroll nudge -- see viewport-flow.ts's doc comment for the reasoning. */
const REASONABLE_SCROLL_PX = 220;

test.describe('Responsive layout: phone portrait 375x667 (Round 1, extra-letter)', () => {
  test.use({ viewport: PHONE_PORTRAIT });

  test('letter tiles and next-button are reachable without scrolling', async ({ page }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    await expectFullyInViewport(page, letterTiles(page).first(), 'letter-tile-0');
    // next-button is disabled until an answer is given (plan.md v2 contract),
    // but must still be positioned within the viewport before that click --
    // this is a layout check, not an interactivity check.
    await expectFullyInViewport(page, page.getByTestId('next-button'), 'next-button');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Responsive layout: phone landscape 667x375 (Round 1, confirmed worst case)', () => {
  test.use({ viewport: PHONE_LANDSCAPE });

  test('letter tiles and next-button are reachable without scrolling', async ({ page }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    await expectFullyInViewport(page, letterTiles(page).first(), 'letter-tile-0');
    await expectFullyInViewport(page, page.getByTestId('next-button'), 'next-button');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Responsive layout: phone portrait 375x667 (Round 4, picture-pair-matching board)', () => {
  test.use({ viewport: PHONE_PORTRAIT });

  test('all 8 pair tiles are reachable, next-button/mistake-count within a reasonable scroll distance', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Round 3 is not under test here -- forced through its
      // speech-recognition-unsupported fallback path deterministically,
      // same rationale as round4-picture-pair-matching.spec.ts.
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);

    const foundAt = await advanceToPicturePairMatching(page);
    expect(
      foundAt,
      'expected at least one picture-pair-matching question within this Round 4 pass (plan.md v8 AC31) -- got none.',
    ).not.toBeNull();

    const tileCount = await pairTiles(page).count();
    expect(tileCount, 'expected exactly 8 pair-tile-{index} elements').toBe(8);

    // The 8-tile board is the spec's own acknowledged hardest case -- tiles
    // themselves must stay within a reasonable scroll distance too (not
    // pixel-perfect zero-scroll, per plan.md v9 scenario 3's explicit
    // tradeoff allowance), so the whole board is discoverable with at most
    // one small scroll nudge, not a full-page scroll to find any of it.
    for (let i = 0; i < tileCount; i++) {
      await expectWithinReasonableScrollDistance(page, pairTiles(page).nth(i), `pair-tile-${i}`, REASONABLE_SCROLL_PX);
    }

    await expectWithinReasonableScrollDistance(
      page,
      page.getByTestId('next-button'),
      'next-button',
      REASONABLE_SCROLL_PX,
    );
    await expectWithinReasonableScrollDistance(
      page,
      page.getByTestId('pair-matching-mistake-count'),
      'pair-matching-mistake-count',
      REASONABLE_SCROLL_PX,
    );

    // Sanity: mistake-count is real, parseable UI (not a stray/hidden node
    // that happens to satisfy the bounding-box check above).
    const mistakeFraction = await readMistakeCount(page);
    expect(mistakeFraction.total).toBeGreaterThan(0);

    await expectNoHorizontalScroll(page);
  });
});
