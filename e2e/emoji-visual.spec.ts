import { test, expect, type Page } from '@playwright/test';
import { advanceToQuestionKind, goToNextRound, runExtraLetterRound, startBatch } from './utils/batch-flow';
import { findExtraLetterOutcome, mascotLocator } from './utils/mascot-flow';
import { answerExtraLetterTile, goToNextQuestion, selectGrade } from './utils/practice-flow';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toEmojiKey } from '../src/lib/emoji/emojiKey';
import { gotoApp } from './utils/auth-flow';

const lottieKeys = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'src/lib/emoji/lottieKeys.generated.json'), 'utf8'),
) as string[];

/**
 * Covers PRD r3 (docs/sdlc/prd.md) EmojiVisual/self-hosted asset ACs:
 * - every emoji-bearing UI element renders through EmojiVisual and exposes
 *   data-emoji-visual / data-emoji-mode / data-emoji-ready,
 * - the visible layer is the local Twemoji SVG (or Noto Lottie in
 *   animated-eligible contexts), with the native glyph kept only as
 *   visually-hidden SR text,
 * - ZERO third-party requests: every emoji/photo/WASM asset is same-origin.
 *
 * Discovery-over-hardcoding discipline applies as elsewhere in this suite:
 * questions are reached via advanceToQuestionKind (Round 1 is a seeded
 * shuffle of 7 extra-letter + 3 image-choice, PRD r3 / D-10), never via
 * fixed question indices.
 */

const EMOJI_VISUAL = '[data-emoji-visual]';

/** Attaches a request recorder; filter with `assertNoThirdParty` afterwards. */
function watchRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (req) => seen.push(req.url()));
  return seen;
}

async function assertNoThirdParty(page: Page, seen: string[]): Promise<void> {
  const origin = new URL(page.url()).origin;
  const thirdParty = seen.filter((u) => u.startsWith('http') && !u.startsWith(origin));
  expect(
    thirdParty,
    `expected zero third-party requests - all emoji/photo/WASM assets must be same-origin, got: ${thirdParty.join(', ')}`,
  ).toEqual([]);
}

test.describe('EmojiVisual self-hosted rendering (PRD r3)', () => {
  test('the mascot renders its generated art on the pre-round screen (CR-82 D-21)', async ({ page }) => {
    const seen = watchRequests(page);
    await gotoApp(page);
    await selectGrade(page);

    /* CR-82 + CR-96: the mascot is no longer an EmojiVisual - it renders
       MascotArt (generated webp + CSS motion) with data-mascot-mood +
       data-mascot-renderer="art". Pre-round screens never mount a player
       and never fetch mascot JSON (D-21). */
    const mascot = mascotLocator(page);
    await expect(mascot, 'expected the mascot to render on the start screen').toBeVisible();
    await expect(mascot).toHaveAttribute('data-mascot-renderer', 'art');
    await expect(
      mascot.locator('img').first(),
      'expected the generated art img inside the mascot',
    ).toHaveAttribute('src', /\/images\/mascot\/be-heo-[\w-]+\.webp/);

    // Only real pose-JSON traffic counts - /src/**/mascot/*.tsx dev-server
    // module requests must not false-positive.
    const mascotTraffic = seen.filter((u) => /\/mascot\/[\w-]+\.json/.test(u));
    expect(
      mascotTraffic,
      `D-21: pre-round screens must not preload or fetch mascot Lottie JSON; got: ${mascotTraffic.join(', ')}`,
    ).toEqual([]);
  });

  test('Round 1 contains image-choice questions whose prompt renders via EmojiVisual', async ({ page }) => {
    await startBatch(page);
    const card = await advanceToQuestionKind(page, 'image-choice');
    await expect(card).toBeVisible();

    const visual = card.locator(EMOJI_VISUAL).first();
    await expect(visual, 'expected the image-choice prompt to render via EmojiVisual').toBeVisible();
    // AC-2.4/AC-9.4 strict check: the prompt emoji's vendored-asset
    // membership decides the REQUIRED mode - lottie iff a Noto animation is
    // vendored for its key, svg otherwise - never 'native' while local
    // assets exist for the vocabulary bank.
    const promptEmoji = (await visual.getAttribute('data-emoji-visual'))!;
    const hasAnimation = (lottieKeys as string[]).includes(toEmojiKey(promptEmoji));
    const expectedMode = hasAnimation ? 'lottie' : 'svg';
    await expect(
      visual,
      `prompt emoji ${promptEmoji} (key ${toEmojiKey(promptEmoji)}) must render in ${expectedMode} mode`,
    ).toHaveAttribute('data-emoji-mode', expectedMode, { timeout: 15_000 });
    if (expectedMode === 'svg') {
      await expect(visual.locator('img').first()).toHaveAttribute('src', /^\/emoji\/svg\//);
    }
    await expect(
      visual,
      'expected data-emoji-ready once the poster or first canvas frame is available',
    ).toHaveAttribute('data-emoji-ready', 'true');
  });

  test('Round 2 listening-image-choice options render EmojiVisual layers (static context)', async ({ page }) => {
    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);

    const card = await advanceToQuestionKind(page, 'listening-image-choice');

    // AC-5.4: ALL FOUR options render through EmojiVisual, not just option 0.
    // Listening options are a STATIC context (design-spec 3.7): 'image' only
    // if all four options carry an approved photo, otherwise 'svg'. 'lottie'
    // is never allowed here.
    for (let i = 0; i < 4; i++) {
      const visual = card.getByTestId(`option-${i}`).locator(EMOJI_VISUAL).first();
      await expect(visual, `expected listening option ${i} to render via EmojiVisual`).toBeVisible();
      await expect(visual).toHaveAttribute('data-emoji-mode', /^(image|svg)$/);
    }
  });

  test('board Lottie budget: the mascot never mounts a player; at most one emoji player per state (CR-82 D-20)', async ({ page }) => {
    // Reach a state where a Lottie layer could mount before measuring:
    // a correct extra-letter answer raises the feedback sheet; at tall
    // viewports the sheet-perch mascot sits there as generated art - the
    // only remaining player candidate is an eligible feedback picture.
    // findExtraLetterOutcome leaves the page on that question with
    // answer-feedback visible.
    const { feedback } = await findExtraLetterOutcome(page, 'correct');
    await expect(feedback).toBeVisible();

    /* GT-8 scope: count ONLY lottie player canvases, never a bare canvas
       (M6 tracing ships a real <canvas> that must not false-positive). */
    const playerCanvases = page.locator('[data-lottie-player] canvas');
    const mascotCanvas = page.locator('[data-lottie-player="mascot"] canvas');

    // The mascot is webp art now - it must never mount a player canvas.
    const mascot = mascotLocator(page);
    await expect(mascot).toHaveAttribute('data-mascot-renderer', 'art');
    await expect(
      mascotCanvas,
      'the mascot must never mount a Lottie canvas (art era)',
    ).toHaveCount(0);

    // Feedback cap (D-20): the mascot no longer takes a slot - at most
    // one eligible feedback illustration may animate.
    const feedbackCanvases = await playerCanvases.count();
    expect(feedbackCanvases, 'D-20: at most 1 Lottie player in feedback state').toBeLessThanOrEqual(1);
    // Exactly one mascot node per screen state - the perch copy only.
    await expect(page.locator('[data-mascot-mood]'), 'one mascot node per screen state').toHaveCount(1);

    // During active question presentation the cap tightens to 1 (D-20):
    // an eligible prompt illustration OR the mascot - never both. Advance,
    // then race a 5s window against a canvas actually attaching - counting
    // immediately would be vacuous (the lazy player needs chunk+JSON+mount
    // latency), but the player must mount inside this window when coming.
    await goToNextQuestion(page);
    await Promise.race([
      playerCanvases.first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {}),
      page.waitForTimeout(5_000),
    ]);
    const questionCanvases = await playerCanvases.count();
    expect(questionCanvases, 'D-20: at most 1 Lottie player during question presentation').toBeLessThanOrEqual(1);
  });

  test('correct-word picture renders inside the answer line (AC-10.2)', async ({ page }) => {
    await startBatch(page);
    const card = await advanceToQuestionKind(page, 'extra-letter');
    await answerExtraLetterTile(page, 0);

    const feedback = page.getByTestId('answer-feedback');
    await expect(feedback).toBeVisible();
    // D-11 + AC-10.2: the picture sits inside the "Từ đúng là:" line itself.
    // Scope to the word line - a bare .last() on the feedback would also
    // match the headline mascot pig.
    const wordLine = feedback.getByText(/Từ đúng là:/);
    const picture = wordLine.locator(EMOJI_VISUAL);
    await expect(
      picture,
      'expected exactly one correct-word picture inside the answer line',
    ).toHaveCount(1);
    await expect(picture).toBeVisible();
    const box = await picture.boundingBox();
    expect(box, 'expected a measurable bounding box for the inline picture').not.toBeNull();
    // AC-10.2: the picture is no taller than the line's own font metrics -
    // 1em inside a text-xl (20 px, line-height 28 px) word line.
    const lineHeight = await wordLine.evaluate(
      (el) => parseFloat(getComputedStyle(el).lineHeight),
    );
    expect(
      box!.height,
      `picture height ${box!.height}px must fit inside the ${lineHeight}px line box`,
    ).toBeLessThanOrEqual(lineHeight);
  });

  test('no Lottie player/WASM/JSON requests on pre-round screens (AC-2.5)', async ({ page }) => {
    const seen = watchRequests(page);
    await gotoApp(page);
    await selectGrade(page);
    // The start-batch screen shows a greeting mascot - always the art
    // renderer pre-round (CR-82 D-21 / CR-96). Wait for it so any
    // deferred chunk or mascot-JSON fetch would have had time to fire.
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await expect(mascotLocator(page)).toHaveAttribute('data-mascot-renderer', 'art');

    const lottieTraffic = seen.filter(
      (u) =>
        u.includes('/emoji/lottie/') ||
        /\/mascot\/[\w-]+\.json/.test(u) ||
        u.includes('.wasm') ||
        u.toLowerCase().includes('dotlottie'),
    );
    expect(
      lottieTraffic,
      `AC-2.5: player chunk/WASM/JSON must lazy-load on first animated mount, not on pre-round screens; got: ${lottieTraffic.join(', ')}`,
    ).toEqual([]);
  });

  test('aborted mascot art webp falls back to the static SVG pose (AC-2.8 / CR-96)', async ({ page }) => {
    // Art failure (missing/corrupt webp) is per-mount: MascotArt swaps to
    // MascotStaticPose - the slot never renders broken.
    let abortedArt = 0;
    await page.route('**/images/mascot/*.webp', (route) => {
      abortedArt++;
      return route.abort();
    });
    // AC-2.8 requires no uncaught error or unhandled rejection on fallback.
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await startBatch(page);
    await runExtraLetterRound(page);

    // Round summary shows the celebrating mascot at block size. With the
    // webp aborted the img errors and the static pose SVG takes over -
    // the renderer attribute stays 'art' (the chosen renderer); the DOM
    // proof is the SVG child.
    const mascot = mascotLocator(page);
    await expect(mascot).toHaveAttribute('data-mascot-renderer', 'art');
    await expect(
      mascot.locator('svg').first(),
      'expected the static SVG fallback inside the mascot after art failure',
    ).toBeVisible({ timeout: 5_000 });

    expect(
      abortedArt,
      'route interception never fired - the mascot fallback path was not actually exercised',
    ).toBeGreaterThan(0);
    expect(
      pageErrors.map((e) => e.message),
      'AC-2.8: fallback must not produce uncaught errors or unhandled rejections',
    ).toEqual([]);
  });

  test('aborted dotlottie WASM never touches the mascot art (AC-2.8)', async ({ page }) => {
    // The mascot has no WASM dependency - aborting every WASM request may
    // degrade eligible emoji Lottie layers but the mascot must keep its
    // generated art mounted.
    await page.route('**/*.wasm', (route) => route.abort());
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await startBatch(page);
    await runExtraLetterRound(page);

    const mascot = mascotLocator(page);
    await expect(mascot).toHaveAttribute('data-mascot-renderer', 'art');
    await expect(
      mascot.locator('img').first(),
      'expected the mascot art img to stay mounted with WASM unavailable',
    ).toBeVisible();

    expect(
      await page.locator('[data-lottie-player="mascot"] canvas').count(),
      'the mascot must never mount a player canvas',
    ).toBe(0);
    expect(
      pageErrors.map((e) => e.message),
      'AC-2.8: WASM failure must not produce uncaught errors or unhandled rejections',
    ).toEqual([]);
  });

  test('no third-party requests occur across a Round 1 image-choice playthrough', async ({ page }) => {
    const seen = watchRequests(page);
    await startBatch(page);
    await advanceToQuestionKind(page, 'image-choice');
    await assertNoThirdParty(page, seen);
  });
});

test.describe('EmojiVisual reduced-motion (PRD r3 / DS-10)', () => {
  test('animated-eligible accents fall back to svg under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const seen = watchRequests(page);
    await startBatch(page);
    await advanceToQuestionKind(page, 'image-choice');

    // Under reduced motion useLottie is false (renderMode.ts) and the
    // mascot art sits still (its CSS motion classes are gated by
    // motion-reduce): every rendered EmojiVisual must resolve to
    // svg/image, never lottie.
    await expect(mascotLocator(page)).toHaveAttribute('data-mascot-renderer', 'art');
    const visuals = page.locator(EMOJI_VISUAL);
    const count = await visuals.count();
    expect(count, 'expected at least one EmojiVisual on an image-choice question').toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      // 'image' only once approved photos ship; 'lottie' never under reduced
      // motion; 'native' would mean a local asset 404 - a real bug signal.
      await expect(visuals.nth(i)).toHaveAttribute('data-emoji-mode', /^(image|svg)$/);
    }
    await assertNoThirdParty(page, seen);
  });

  test('a full reduced-motion Round 1 issues zero lottie/WASM requests and mounts zero canvases (AC-2.7)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const seen = watchRequests(page);
    await startBatch(page);
    // Round 1 covers every animated-eligible surface in the round flow:
    // image-choice prompts, feedback accents (✨ on correct answers) and
    // correct-word pictures.
    await runExtraLetterRound(page);

    const lottieTraffic = seen.filter(
      (u) =>
        u.includes('/emoji/lottie/') ||
        /\/mascot\/[\w-]+\.json/.test(u) ||
        u.includes('.wasm') ||
        u.toLowerCase().includes('dotlottie'),
    );
    expect(
      lottieTraffic,
      `AC-2.7/D-20: under prefers-reduced-motion zero player/WASM/lottie-JSON traffic is allowed; got: ${lottieTraffic.join(', ')}`,
    ).toEqual([]);
    expect(
      await page.locator('[data-lottie-player] canvas').count(),
      'expected zero Lottie canvases under reduced motion',
    ).toBe(0);
    await assertNoThirdParty(page, seen);
  });
});
