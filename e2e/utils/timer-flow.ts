import type { Locator, Page } from '@playwright/test';
import { type Fraction, parseFraction } from './practice-flow';

/**
 * Helpers for plan.md v7 ("Live Score Display + Round Timer") -- `live-score`
 * (AC26) and `round-timer` (AC27-AC29). Split out from practice-flow.ts /
 * batch-flow.ts to keep those files under the project's ~200-line
 * guideline, following the same per-concern split as option-flow.ts and
 * round34-flow.ts.
 *
 * Written BEFORE a real v7 implementation existed (built by another agent
 * in parallel). If `live-score` / `round-timer` do not render yet, callers
 * of these helpers fail with a "no element found" / not-visible error --
 * that is the expected signal of an in-progress parallel build, not a
 * helper bug. See round-live-score.spec.ts and round-timer.spec.ts's own
 * doc comments, and plans/reports/tester-260831-student-self-practice-v7-
 * score-timer.md, for the full disclosure and current pass/fail status.
 */

export function liveScoreLocator(page: Page): Locator {
  return page.getByTestId('live-score');
}

export function roundTimerLocator(page: Page): Locator {
  return page.getByTestId('round-timer');
}

/**
 * Reads live-score's running "X/Y" tally (X = correct so far, Y = answered
 * so far -- plan.md v7 AC26). Reuses parseFraction's tolerant "find the two
 * numbers" technique, so this holds regardless of the surrounding Vietnamese
 * copy (e.g. "Diem: 2/3").
 */
export async function readLiveScore(page: Page): Promise<Fraction> {
  const text = (await liveScoreLocator(page).innerText()).trim();
  return parseFraction(text, 'live-score');
}

/**
 * Parses a mm:ss (or m:ss) countdown out of round-timer's text, regardless
 * of surrounding copy/icons (e.g. "04:32", (icon) 4:32"), same
 * "only look for the recognizable pattern, ignore surrounding copy"
 * technique as parseFraction. Returns total whole seconds remaining.
 */
export function parseTimerSeconds(text: string): number {
  const match = text.match(/(\d{1,2}):(\d{2})\b/);
  if (!match) {
    throw new Error(`round-timer text did not match an "M:SS" or "MM:SS" countdown pattern, got: "${text}"`);
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

export async function readRoundTimerSeconds(page: Page): Promise<number> {
  const text = (await roundTimerLocator(page).innerText()).trim();
  return parseTimerSeconds(text);
}

/**
 * Checks for a documented test-only hook to fast-forward the round timer
 * without a real wait (suggested convention: expose
 * window.__setRoundTimerRemainingSecondsForTesting(seconds) in dev/test
 * builds only). Returns false if no such hook exists -- see
 * round-timer.spec.ts's timer-expiry scenario for why this suite does not
 * wait out a real 5:00 countdown to test AC28 directly.
 */
export async function hasRoundTimerTestHook(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof (window as any).__setRoundTimerRemainingSecondsForTesting === 'function');
}

export async function fastForwardRoundTimerForTesting(page: Page, seconds: number): Promise<void> {
  await page.evaluate((value) => {
    (window as any).__setRoundTimerRemainingSecondsForTesting(value);
  }, seconds);
}
