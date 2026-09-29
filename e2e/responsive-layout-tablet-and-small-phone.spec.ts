import { test } from '@playwright/test';
import { advanceToQuestionKind, startBatch } from './utils/batch-flow';
import { letterTiles } from './utils/practice-flow';
import {
  IPAD_PORTRAIT,
  SMALL_PHONE_PORTRAIT,
  expectFullyInViewport,
  expectNoHorizontalScroll,
  expectWithinReasonableScrollDistance,
} from './utils/viewport-flow';

/**
 * Two remaining plan.md v9 responsive checks, split out of
 * responsive-layout-phone.spec.ts to keep both files under the project's
 * ~200-line guideline:
 *
 * 1. 320x568 (small phone portrait) -- same Round 1 zero-scroll check as
 *    375x667/667x375, on the smallest confirmed-tested viewport.
 * 2. 768x1024 (iPad portrait) -- a quick REGRESSION check only. Plan.md v9
 *    states iPad is "already confirmed good" ("existing sm: breakpoints
 *    already give a clean multi-column layout") -- this exists purely to
 *    catch the header-chrome-compaction fix accidentally breaking the
 *    already-working tablet layout while fixing phone sizes, not to
 *    re-prove iPad correctness from scratch.
 *
 * Same "written against spec before the fix may have landed" disclosure as
 * responsive-layout-phone.spec.ts -- see that file's doc comment and
 * plans/reports/tester-260908-student-self-practice-v9-responsive.md.
 * Independent of every other test/spec file; own fresh Batch per test.
 */

test.describe('Responsive layout: small phone portrait 320x568 (Round 1, extra-letter)', () => {
  test.use({ viewport: SMALL_PHONE_PORTRAIT });

  test('letter tiles and next-button are reachable without scrolling', async ({ page }) => {
    await startBatch(page);
    await advanceToQuestionKind(page, 'extra-letter');

    await expectFullyInViewport(page, letterTiles(page).first(), 'letter-tile-0');
    /* CR-12: word length is seed-drawn AND the visible scrollbar eats
       ~15px of a 320px viewport, so the same draw can wrap tiles into 2
       or 3 rows. Three rows of mandatory ~76px targets + header + card
       chrome physically cannot fit 568px - the documented plan.md v9
       tradeoff also used for Round 4's 8-tile board. The button must stay
       within one small scroll (160px cap), never a full-screen scroll. */
    await expectWithinReasonableScrollDistance(page, page.getByTestId('next-button'), 'next-button', 160);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Responsive layout: iPad portrait 768x1024 (regression check, already confirmed good)', () => {
  test.use({ viewport: IPAD_PORTRAIT });

  test('letter tiles and next-button remain reachable without scrolling', async ({ page }) => {
    await startBatch(page);
    await advanceToQuestionKind(page, 'extra-letter');

    await expectFullyInViewport(page, letterTiles(page).first(), 'letter-tile-0');
    await expectFullyInViewport(page, page.getByTestId('next-button'), 'next-button');
    await expectNoHorizontalScroll(page);
  });
});
