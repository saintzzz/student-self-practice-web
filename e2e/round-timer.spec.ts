import { test, expect } from '@playwright/test';
import { goToNextRound, runExtraLetterRound, startBatch } from './utils/batch-flow';
import { currentQuestionKind } from './utils/practice-flow';
import {
  fastForwardRoundTimerForTesting,
  hasRoundTimerTestHook,
  readRoundTimerSeconds,
  roundTimerLocator,
} from './utils/timer-flow';

/**
 * Covers plan.md v7 AC27-AC29 (Round Timer): a 5:00 per-Round countdown,
 * visible throughout a Round's active question loop, that resets fresh at
 * the start of every Round (per-Round, not shared across the whole Batch),
 * and that ends the Round early into round-score-summary if it reaches
 * 0:00 before all of that Round's questions are answered.
 *
 * Written BEFORE a real v7 implementation existed (built by another agent in
 * parallel). If `round-timer` does not render yet, the first two tests below
 * fail with a "no element found" / not-visible timeout -- that is the
 * expected signal of an in-progress parallel build, not a test bug. See
 * plans/reports/tester-260831-student-self-practice-v7-score-timer.md for
 * pass/fail status per scenario.
 *
 * TIMER-EXPIRY TESTABILITY (AC28, the third test below): waiting out a real
 * 5:00 countdown in an E2E test is impractical and would violate this
 * suite's wall-clock-time discipline (no test should take minutes to run).
 * This suite therefore looks for a documented test-only fast-forward hook
 * (window.__setRoundTimerRemainingSecondsForTesting(seconds), suggested
 * convention -- see ./utils/timer-flow.ts) and, if it is not present, skips
 * with a clear on-record reason rather than either waiting 5 real minutes or
 * silently omitting the scenario. AC28 is otherwise best covered by the
 * engineer's own unit tests using fake timers (e.g. vi.useFakeTimers()),
 * which can deterministically advance a mocked clock to 0 without any real
 * wait -- that is the intended primary coverage for this behavior, not this
 * E2E suite.
 */
test.describe('Batch/Round: round timer (AC27, AC28, AC29)', () => {
  test('round-timer is visible during an active Round, starts near 5:00, and visibly decreases over a short real wait', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    const timer = roundTimerLocator(page);
    await expect(timer, 'expected round-timer to be visible throughout an active Round (plan.md v7 AC27)').toBeVisible();

    const firstSeconds = await readRoundTimerSeconds(page);
    expect(
      firstSeconds,
      `expected round-timer to start at/near 5:00 (300s) when a Round begins (plan.md v7 AC27), got ${firstSeconds}s`,
    ).toBeGreaterThan(290);
    expect(firstSeconds).toBeLessThanOrEqual(300);

    // Short, clearly-justified real wait (a few seconds, never minutes) to
    // observe the countdown actually decrementing, per this suite's
    // wall-clock-time constraint.
    await page.waitForTimeout(3_000);

    const secondSeconds = await readRoundTimerSeconds(page);
    expect(
      secondSeconds,
      `expected round-timer to have decreased after a 3s real wait (first read ${firstSeconds}s, second read ` +
        `${secondSeconds}s) -- a timer that never decrements would fail this, which is the point of this assertion`,
    ).toBeLessThan(firstSeconds);
  });

  test('round-timer resets to a fresh ~5:00 at the start of Round 2, proving it is per-Round rather than Batch-wide (AC29)', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    // Let Round 1's timer visibly run down for a few seconds before finishing
    // the round, so that a later "Round 2 starts near 5:00" reading is a
    // genuine reset, not just an untouched/never-started timer that
    // coincidentally reads close to 300s.
    await page.waitForTimeout(3_000);
    const round1SecondsAfterWait = await readRoundTimerSeconds(page);
    expect(
      round1SecondsAfterWait,
      `expected Round 1's timer to have counted down below 300s after a 3s wait, got ${round1SecondsAfterWait}s`,
    ).toBeLessThan(300);

    await runExtraLetterRound(page);
    await goToNextRound(page);

    await currentQuestionKind(page, 'listening-sentence-fill-blank');
    const round2Seconds = await readRoundTimerSeconds(page);
    expect(
      round2Seconds,
      `expected round-timer to reset to a fresh ~5:00 at the start of Round 2 (plan.md v7 AC29), got ${round2Seconds}s ` +
        `(Round 1 had counted down to ${round1SecondsAfterWait}s before Round 2 began)`,
    ).toBeGreaterThan(290);
  });

  test('Round ends immediately into round-score-summary if the timer reaches 0:00 before all questions are answered (AC28)', async ({
    page,
  }) => {
    await startBatch(page);
    await currentQuestionKind(page, 'extra-letter');

    const hookAvailable = await hasRoundTimerTestHook(page);
    test.skip(
      !hookAvailable,
      'No test-only fast-forward hook found for the round timer (checked for a callable ' +
        'window.__setRoundTimerRemainingSecondsForTesting). Waiting out a real 5:00 countdown in an E2E test is ' +
        "impractical and would violate this suite's wall-clock-time constraint, so this scenario is deliberately " +
        'not exercised with a real wait. AC28 (timer-expiry ends the Round early into round-score-summary, scored ' +
        'on only what was answered so far) is better covered by the engineer\'s own unit tests using fake timers ' +
        '(e.g. vi.useFakeTimers()) that can deterministically advance a mocked clock to 0 without a real wait. If ' +
        'a test-only hook is added later (suggested convention: expose ' +
        'window.__setRoundTimerRemainingSecondsForTesting(seconds) in dev/test builds only), this test\'s scaffolding ' +
        'above already detects and will use it automatically.',
    );

    await fastForwardRoundTimerForTesting(page, 1);

    await expect(
      page.getByTestId('round-score-summary'),
      'expected the Round to end immediately into round-score-summary once the fast-forwarded timer reaches 0:00 (AC28)',
    ).toBeVisible({ timeout: 5_000 });
  });
});
