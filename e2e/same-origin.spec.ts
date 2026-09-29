import { test, expect } from '@playwright/test';
import {
  goToNextRound,
  runExtraLetterRound,
  runListeningSentenceRound,
  startBatch,
} from './utils/batch-flow';
import {
  runDescribeAndChooseImageRound,
  runPronunciationRecordingRoundFallback,
} from './utils/round34-flow';

/**
 * C4 runtime gate (PRD r3 AC-2.6 / constitution constraint C4): at runtime
 * the app must never reach a third-party origin. This spec records EVERY
 * request through the full user journey - Grade select -> Credits -> back
 * -> a complete 4-round Batch -> batch summary - and asserts all URLs are
 * same-origin. That means emoji SVGs, Lottie JSON, the dotlottie WASM, any
 * approved photos, and attribution.json are all self-hosted.
 *
 * The production build-side half of C4 (entry chunk contains no dotlottie
 * runtime refs, AC-2.5) is enforced by scripts/check-bundle-budget.mjs.
 */

const EMOJI_VISUAL = '[data-emoji-visual]';

test.describe('Same-origin asset gate (PRD r3 AC-2.6, C4)', () => {
  test('every request across a full Grade->Credits->Batch journey is same-origin', async ({ page }) => {
    // Round 3 must run through its deterministic fallback path: remove
    // SpeechRecognition before any app code runs (same technique as
    // batch-full-flow.spec.ts / round3-pronunciation-recording.spec.ts).
    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
    });
    const seen: string[] = [];
    page.on('request', (req) => seen.push(req.url()));
    // Console hygiene sweep for the test report (C4-adjacent): the full
    // journey must not emit page errors or console errors.
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Grade select -> Credits -> back (attribution.json fetch included).
    await page.goto('/');
    await page.getByTestId('credits-link').click();
    await expect(page.getByTestId('credits-collection-twemoji')).toBeVisible();
    await page.getByTestId('credits-back').click();
    await expect(page.getByTestId('grade-card-grade-2')).toBeVisible();

    // 2. Full 4-round batch, exercising every EmojiVisual surface
    //    (image-choice prompts, feedback accents + pictures, listening
    //    option visuals, describe options, pair tiles, summary accents).
    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);
    await runListeningSentenceRound(page);
    await goToNextRound(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);
    await runDescribeAndChooseImageRound(page);
    await goToNextRound(page);
    await expect(page.getByTestId('batch-score-summary')).toBeVisible();

    // Give any still-in-flight lazy asset (e.g. a summary-accent lottie) a
    // moment to resolve so the recorder is complete.
    await page.waitForTimeout(500);

    const origin = new URL(page.url()).origin;
    const thirdParty = seen.filter((u) => u.startsWith('http') && !u.startsWith(origin));
    expect(
      thirdParty,
      `C4 violation - third-party requests seen during full journey: ${thirdParty.join(', ')}`,
    ).toEqual([]);

    // Sanity: the journey must actually have exercised emoji assets - an
    // empty recording would make this test vacuous.
    const assetTraffic = seen.filter((u) => u.includes('/emoji/'));
    expect(
      assetTraffic.length,
      'expected the journey to fetch at least one self-hosted emoji asset',
    ).toBeGreaterThan(0);

    expect(
      pageErrors.map((e) => e.message),
      `uncaught page errors during the full journey: ${pageErrors.map((e) => e.message).join(', ')}`,
    ).toEqual([]);
    expect(
      consoleErrors,
      `console.error calls during the full journey: ${consoleErrors.join(', ')}`,
    ).toEqual([]);
  });

  test('feedback-state visuals stay same-origin through Round 1', async ({ page }) => {
    const seen: string[] = [];
    page.on('request', (req) => seen.push(req.url()));
    await startBatch(page);
    await runExtraLetterRound(page);

    // Round summary celebratory accent is the last animated mount; give it
    // a beat, then audit everything the round pulled.
    await expect(page.locator(EMOJI_VISUAL).first()).toBeVisible();
    const origin = new URL(page.url()).origin;
    const thirdParty = seen.filter((u) => u.startsWith('http') && !u.startsWith(origin));
    expect(thirdParty, `C4 violation in Round 1 journey: ${thirdParty.join(', ')}`).toEqual([]);
  });
});
