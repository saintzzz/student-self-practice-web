import { test, expect } from '@playwright/test';
import {
  goToNextRound,
  runExtraLetterRound,
  runGameRound,
  runListeningSentenceRound,
  startBatch,
} from './utils/batch-flow';
import {
  runDescribeAndChooseImageRound,
  runPronunciationRecordingRoundFallback,
} from './utils/round34-flow';
import { gotoApp } from './utils/auth-flow';

/**
 * C4 runtime gate (PRD r3 AC-2.6 / constitution constraint C4): at runtime
 * the app must never reach a third-party origin. This spec records EVERY
 * request through the full user journey - Grade select -> Credits -> back
 * -> a complete 5-round Batch -> batch summary - and asserts all URLs are
 * same-origin. That means emoji SVGs, Lottie JSON, the dotlottie WASM, any
 * approved photos, and attribution.json are all self-hosted.
 *
 * The production build-side half of C4 (entry chunk contains no dotlottie
 * runtime refs, AC-2.5) is enforced by scripts/check-bundle-budget.mjs.
 */

/** Origins that are not "third-party" for C4: the app itself and the
 *  configured Supabase backend (auth REST, Storage audio/images).
 *  Supabase is the app's own backend - the gate hunts CDN leakage of
 *  media assets (emoji, lottie, photos), not the data plane. Without
 *  VITE_SUPABASE_URL the app runs guest-only and no extra origin is
 *  allowed, so the gate is never vacuous (external-review r5). */
function allowedOrigins(pageOrigin: string): string[] {
  const origins = [pageOrigin];
  const supa = process.env.VITE_SUPABASE_URL;
  if (supa) origins.push(new URL(supa).origin);
  return origins;
}
const isExternal = (u: string, allowed: string[]) =>
  u.startsWith('http') && !allowed.some((o) => u.startsWith(o));

test.describe('Same-origin asset gate (PRD r3 AC-2.6, C4)', () => {
  test('every request across a full Grade->Credits->Batch journey is same-origin', async ({ page }) => {
    // Full 5-round journey incl. the CR-86 game round - >90s under load.
    test.setTimeout(150_000);
    // Round 3 must run through its deterministic fallback path: remove
    // SpeechRecognition before any app code runs (same technique as
    // batch-full-flow.spec.ts / round3-pronunciation-recording.spec.ts).
    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
      // MediaRecorder is the recorder fallback - delete it too or
      // Chromium silently routes to recorder mode instead of the
      // 'unsupported' state under test (external-review r4).
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.MediaRecorder;
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
    await gotoApp(page);
    await page.getByTestId('credits-link').click();
    await expect(page.getByTestId('credits-collection-twemoji')).toBeVisible();
    await page.getByTestId('credits-back').click();
    await expect(page.getByTestId('grade-card-grade-2')).toBeVisible();

    // 2. Full 5-round batch (4 question rounds + CR-86 bonus game round),
    //    exercising every EmojiVisual surface (image-choice prompts,
    //    feedback accents + pictures, listening option visuals, describe
    //    options, pair tiles, summary accents, game art).
    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);
    await runListeningSentenceRound(page);
    await goToNextRound(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);
    await runDescribeAndChooseImageRound(page);
    await goToNextRound(page);
    await runGameRound(page);
    await goToNextRound(page);
    await expect(page.getByTestId('batch-score-summary')).toBeVisible();

    // Give any still-in-flight lazy asset (e.g. a summary-accent lottie) a
    // moment to resolve so the recorder is complete.
    await page.waitForTimeout(500);

    const allowed = allowedOrigins(new URL(page.url()).origin);
    const thirdParty = seen.filter((u) => isExternal(u, allowed));
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

    /* Sanity: the round must actually have pulled self-hosted emoji
       assets (an empty audit would make this vacuous). A DOM-level
       [data-emoji-visual] on the round summary is NOT guaranteed - it
       only renders inside sticker chips, and no Round-1 sticker is
       unconditional (first-batch = whole batch, perfect-round = 10/10),
       so assert on the request log like the full-journey test does. */
    const emojiTraffic = seen.filter((u) => u.includes('/emoji/'));
    expect(
      emojiTraffic.length,
      'expected Round 1 to fetch at least one self-hosted emoji asset',
    ).toBeGreaterThan(0);
    const allowed = allowedOrigins(new URL(page.url()).origin);
    const thirdParty = seen.filter((u) => isExternal(u, allowed));
    expect(thirdParty, `C4 violation in Round 1 journey: ${thirdParty.join(', ')}`).toEqual([]);
  });
});
