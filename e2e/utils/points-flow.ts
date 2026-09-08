import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Points-figure discovery helpers for plan.md v10 ("IOE-Style Points
 * Scoring"), AC34-AC37. The engineer's exact data-testid choices for the
 * new points figures (Round/Batch summary headline points, per-round
 * breakdown points) were not pinned by plan.md v10's data-testid contract,
 * so per this task's discovery-over-hardcoding discipline (same as every
 * other *-flow.ts file in this suite), every reader below finds its target
 * by the "N điểm" / "X/Y điểm" text pattern the IOE-style copy always uses,
 * never by assuming one exact testid string. This holds regardless of which
 * element actually carries the text (a <p>, a <span>, nested inside a
 * testid'd container or not) -- Playwright's getByText matches on rendered
 * text content, independent of any testid.
 *
 * `live-score` is the one exception: it is a pre-existing, spec-guaranteed
 * testid from plan.md v7 (AC26), and plan.md v10 only grows its existing
 * text to also carry a "N điểm" figure -- so readLiveScorePoints anchors to
 * that stable testid directly rather than a page-wide text search.
 *
 * Written BEFORE this task could confirm the real v10 implementation's exact
 * DOM shape. If none of these patterns are found anywhere expected, callers
 * get a clear "not found" error -- the expected signal of a not-yet-landed
 * (or differently-shaped) v10 change, not a helper bug.
 */

const BARE_POINTS_PATTERN = /(\d+)\s*điểm/;
const POINTS_FRACTION_PATTERN = /(\d+)\s*\/\s*(\d+)\s*điểm/;

export interface PointsFraction {
  points: number;
  maxPoints: number;
}

/**
 * Reads the running point total out of live-score's own text. Throws if no
 * "N điểm" pattern is found, which is the expected signal before the v10
 * points-scoring change lands in LiveScore.tsx.
 */
export async function readLiveScorePoints(page: Page): Promise<number> {
  const text = (await page.getByTestId('live-score').innerText()).trim();
  const match = text.match(BARE_POINTS_PATTERN);
  if (!match) {
    throw new Error(
      `live-score did not contain a "N điểm" points figure (plan.md v10 AC35 -- LiveScore should show the running ` +
        `point total alongside the existing X/Y đúng fraction). Got: "${text}".`,
    );
  }
  return Number(match[1]);
}

/**
 * Finds SOME visible element (within `within`, or the whole page) whose own
 * text matches a "X/Y điểm" points-out-of-max fraction (plan.md v10 AC36:
 * RoundSummary / BatchSummary headline). `.first()` returns the first such
 * match in DOM order, which -- for BatchSummary specifically -- is expected
 * to be the headline figure (rendered before the per-round breakdown list).
 */
export async function findPointsFraction(page: Page, within?: Locator): Promise<PointsFraction> {
  const scope = within ?? page.locator('body');
  const candidate = scope.getByText(POINTS_FRACTION_PATTERN).first();
  await expect(
    candidate,
    'expected to find some element showing a "X/Y điểm" points-out-of-max figure (plan.md v10 AC36), found none. ' +
      'This is the expected failure signal if the v10 points-scoring change has not landed in this screen yet.',
  ).toBeVisible();

  const text = (await candidate.innerText()).trim();
  const match = text.match(POINTS_FRACTION_PATTERN);
  if (!match) {
    throw new Error(`Matched element's text did not re-parse as "X/Y điểm" on second read, got: "${text}"`);
  }
  return { points: Number(match[1]), maxPoints: Number(match[2]) };
}
