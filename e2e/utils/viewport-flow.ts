import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Viewport-bounds helpers for plan.md v9 ("Responsive Layout Fix + Age-7
 * Touch/Visual Polish"), guarding against the confirmed regression: on
 * phone-sized viewports the persistent header stack (round-progress +
 * live-score + round-timer + question-progress) combined with
 * content-heavy questions (Round 1's wrapped letter tiles, Round 4's
 * 8-tile picture-pair-matching board) pushes the answer/Next button below
 * the visible viewport, requiring a scroll a 7-year-old may not discover on
 * their own. Confirmed worst case: phone landscape (667x375), button fully
 * hidden with no scroll affordance.
 *
 * Playwright's default toBeVisible() only proves an element is not
 * display:none / visibility:hidden / zero-size -- it does NOT prove the
 * element sits within the CURRENT scroll position's visible viewport. An
 * element pushed below the fold is still "visible" by that definition. This
 * file checks actual boundingBox() coordinates against the real viewport
 * size (page.viewportSize()), plus Playwright's toBeInViewport() matcher,
 * to catch the real regression this spec exists to guard against.
 *
 * Written against plan.md v9's spec text -- the engineer's fix (compacting
 * header chrome + reconciling with the ~76px touch-target increase) may not
 * have landed when these tests first run. A failure here that shows an
 * element's box below the viewport bottom is the EXPECTED signal of the fix
 * being in-progress, not a test bug -- see the spec files' own doc comments
 * for current pass/fail disclosure.
 */

export interface ViewportSize {
  width: number;
  height: number;
}

export const PHONE_PORTRAIT: ViewportSize = { width: 375, height: 667 };
export const PHONE_LANDSCAPE: ViewportSize = { width: 667, height: 375 };
export const SMALL_PHONE_PORTRAIT: ViewportSize = { width: 320, height: 568 };
export const IPAD_PORTRAIT: ViewportSize = { width: 768, height: 1024 };

export interface ViewportFitResult {
  fits: boolean;
  box: { x: number; y: number; width: number; height: number } | null;
  viewport: ViewportSize;
}

/**
 * Checks whether locator's bounding box is fully contained within the
 * viewport's [0, width] x [0, height] bounds WITHOUT scrolling -- exactly
 * what a student sees on first render, no scroll gesture performed. Returns
 * a result object (not a throw) so callers can build one descriptive
 * assertion message that reports the real box vs viewport for CI debugging.
 */
export async function checkFitsInViewportNoScroll(page: Page, locator: Locator): Promise<ViewportFitResult> {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('page.viewportSize() returned null -- a viewport size must be set for this check to be meaningful.');
  }
  const box = await locator.boundingBox();
  if (!box) {
    return { fits: false, box: null, viewport };
  }
  const fits = box.y >= 0 && box.x >= 0 && box.y + box.height <= viewport.height && box.x + box.width <= viewport.width;
  return { fits, box, viewport };
}

export function describeFit(label: string, result: ViewportFitResult): string {
  if (!result.box) {
    return `${label}: no bounding box found (element not rendered, detached, or zero-size)`;
  }
  const { box, viewport } = result;
  return (
    `${label}: box [top=${box.y.toFixed(0)} bottom=${(box.y + box.height).toFixed(0)} ` +
    `left=${box.x.toFixed(0)} right=${(box.x + box.width).toFixed(0)}] vs viewport ${viewport.width}x${viewport.height}`
  );
}

/**
 * Asserts an element is fully within the visible viewport bounds without
 * scrolling -- pairs Playwright's own toBeInViewport({ ratio: 1 }) (the
 * documented, maintained way to assert full-visibility) with a manual
 * boundingBox() cross-check that produces a more diagnostic failure message
 * (exact pixel overshoot vs viewport), belt-and-suspenders for a regression
 * this important to catch reliably.
 */
export async function expectFullyInViewport(page: Page, locator: Locator, label: string): Promise<void> {
  await expect(locator, `${label} should be within the viewport with zero scrolling (plan.md v9)`).toBeInViewport({
    ratio: 1,
  });
  const result = await checkFitsInViewportNoScroll(page, locator);
  expect(result.fits, describeFit(label, result)).toBe(true);
}

/**
 * Looser check for the one scenario plan.md v9 explicitly tolerates a small
 * scroll tradeoff for (Round 4's 8-tile picture-pair-matching board on the
 * smallest phones) -- the regression being guarded against is "completely
 * hidden, full-page scroll required to discover", not pixel-perfect
 * zero-scroll. Passes as long as the element's top edge is within
 * maxScrollPx of the viewport's bottom edge, i.e. discoverable with one
 * small, obvious scroll nudge rather than a full extra screen's worth of
 * scrolling.
 */
export async function expectWithinReasonableScrollDistance(
  page: Page,
  locator: Locator,
  label: string,
  maxScrollPx: number,
): Promise<void> {
  const result = await checkFitsInViewportNoScroll(page, locator);
  if (!result.box) {
    throw new Error(`${label}: no bounding box found -- cannot evaluate scroll distance. ${describeFit(label, result)}`);
  }
  if (result.fits) return; // already fully in view, trivially within any scroll allowance

  const overshootPx = result.box.y + result.box.height - result.viewport.height;
  expect(
    overshootPx,
    `${label} bottom edge is ${overshootPx.toFixed(0)}px below the viewport bottom (viewport height ` +
      `${result.viewport.height}px), exceeding the ${maxScrollPx}px "reasonable single-scroll" allowance -- this is the ` +
      `"completely hidden, full-page scroll required" regression plan.md v9 describes. ${describeFit(label, result)}`,
  ).toBeLessThanOrEqual(maxScrollPx);
}

/** plan.md v9 test strategy: "no horizontal scroll appears anywhere". */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflowPx, `expected no horizontal overflow, but scrollWidth exceeds clientWidth by ${overflowPx}px`).toBeLessThanOrEqual(0);
}
