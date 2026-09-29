import { test, expect, type Page } from '@playwright/test';
import { advanceToQuestionKind, goToNextRound, runExtraLetterRound, startBatch } from './utils/batch-flow';
import { findExtraLetterOutcome } from './utils/mascot-flow';
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
  test('mascot pig renders through EmojiVisual as a same-origin Twemoji SVG', async ({ page }) => {
    await gotoApp(page);
    await selectGrade(page);

    const pig = page.locator('[data-emoji-visual="🐷"]').first();
    await expect(pig, 'expected the mascot pig to render via EmojiVisual').toBeVisible();
    // 🐷 has no Noto animation (PRD r3 / D-2): mode must be the static svg layer.
    await expect(pig).toHaveAttribute('data-emoji-mode', 'svg');
    await expect(pig.locator('img')).toHaveAttribute('src', '/emoji/svg/1f437.svg');
    // SR-only emoji text layer is preserved for semantics (design-spec 3.4).
    await expect(pig.locator('.sr-only')).toHaveText('🐷');
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

  test('at most one Lottie canvas during a question, at most two in feedback (AC-2.9)', async ({ page }) => {
    // Reach a state where a Lottie layer actually mounts before measuring:
    // a correct extra-letter answer puts the happy mascot's ✨ accent into
    // feedback, and ✨ carries a Noto Lottie asset (2728.json is vendored).
    // findExtraLetterOutcome leaves the page on that question with
    // answer-feedback visible.
    const { feedback } = await findExtraLetterOutcome(page, 'correct');

    const accent = feedback.locator('[data-emoji-visual="✨"]');
    await expect(
      accent,
      'expected the happy accent to stay in lottie mode (not an early-fallback svg)',
    ).toHaveAttribute('data-emoji-mode', 'lottie', { timeout: 15_000 });
    // A <canvas> element inside the DotLottieReact wrapper is the real proof
    // the player mounted - data-emoji-ready alone can flip early via the
    // SVG poster's staticReady, before any player exists.
    const canvases = page.locator('canvas');
    await expect(
      canvases.first(),
      'expected at least one live Lottie canvas in feedback',
    ).toBeAttached({ timeout: 15_000 });

    // Feedback state cap (PRD r3 A-09): the ✨ accent plus, when the word's
    // emoji also has a Lottie asset, the correct-word picture - two players
    // at most, never more.
    const feedbackCanvases = await canvases.count();
    expect(feedbackCanvases, 'AC-2.9/A-09: at most 2 Lottie players in feedback state').toBeLessThanOrEqual(2);

    // During active question presentation the cap tightens to 1
    // (design-spec 3.9): advance to the next question, then race a 5s
    // window against a canvas actually attaching - counting immediately
    // would be vacuous (the lazy player needs chunk+JSON+mount latency),
    // but the player must mount inside this window when one is coming.
    await goToNextQuestion(page);
    await Promise.race([
      canvases.first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {}),
      page.waitForTimeout(5_000),
    ]);
    const questionCanvases = await page.locator('canvas').count();
    expect(questionCanvases, 'AC-2.9: at most 1 Lottie player during question presentation').toBeLessThanOrEqual(1);
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
    // The start-batch screen shows a greeting mascot (static svg only -
    // greeting/encouraging moods carry no accent). Wait for it so any
    // deferred chunk fetch would have had time to fire.
    await expect(page.getByTestId('start-batch-button')).toBeVisible();
    await expect(page.locator('[data-emoji-visual="🐷"]').first()).toHaveAttribute('data-emoji-mode', 'svg');

    const lottieTraffic = seen.filter(
      (u) => u.includes('/emoji/lottie/') || u.includes('.wasm') || u.toLowerCase().includes('dotlottie'),
    );
    expect(
      lottieTraffic,
      `AC-2.5: player chunk/WASM/JSON must lazy-load on first animated mount, not on pre-round screens; got: ${lottieTraffic.join(', ')}`,
    ).toEqual([]);
  });

  test('aborted Lottie JSON falls back to same-origin svg (AC-2.8)', async ({ page }) => {
    // Data failure (missing/corrupt JSON) is per-mount: the accent falls
    // back to the local SVG layer without tripping the session breaker
    // (DS-9).
    let abortedJson = 0;
    await page.route('**/emoji/lottie/*.json', (route) => {
      abortedJson++;
      return route.abort();
    });
    // AC-2.8 requires no uncaught error or unhandled rejection on fallback.
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await startBatch(page);
    await runExtraLetterRound(page);

    // Round summary shows the celebrating mascot - 🎉 carries a Lottie
    // asset (1f389) so it is a guaranteed animated mount once feedback
    // lands. With JSON aborted it must resolve to svg.
    const accent = page.locator('[data-emoji-visual="🎉"]').first();
    await expect(accent, 'expected the celebrating accent to fall back to svg after JSON failure')
      .toHaveAttribute('data-emoji-mode', 'svg', { timeout: 5_000 });
    await expect(accent.locator('img')).toHaveAttribute('src', /^\/emoji\/svg\//);

    expect(
      abortedJson,
      'route interception never fired - the fallback path was not actually exercised',
    ).toBeGreaterThan(0);
    expect(
      pageErrors.map((e) => e.message),
      'AC-2.8: fallback must not produce uncaught errors or unhandled rejections',
    ).toEqual([]);
  });

  test('aborted dotlottie WASM falls back to svg via the runtime path (AC-2.8)', async ({ page }) => {
    // Player-init failure (WASM unreachable) is a runtime failure: EmojiVisual
    // must still converge to the svg layer on the affected mounts.
    let abortedWasm = 0;
    await page.route('**/*.wasm', (route) => {
      abortedWasm++;
      return route.abort();
    });
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await startBatch(page);
    await runExtraLetterRound(page);

    const accent = page.locator('[data-emoji-visual="🎉"]').first();
    await expect(accent, 'expected the celebrating accent to fall back to svg after WASM failure')
      .toHaveAttribute('data-emoji-mode', 'svg', { timeout: 5_000 });

    expect(
      abortedWasm,
      'WASM interception never fired - the runtime-failure path was not actually exercised',
    ).toBeGreaterThan(0);
    expect(
      pageErrors.map((e) => e.message),
      'AC-2.8: WASM fallback must not produce uncaught errors or unhandled rejections',
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

    // The mascot accents ✨/🎉 carry Noto Lottie assets; under reduced motion
    // useLottie is false (renderMode.ts), so any rendered EmojiVisual must
    // resolve to svg/image, never lottie.
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
      (u) => u.includes('/emoji/lottie/') || u.includes('.wasm') || u.toLowerCase().includes('dotlottie'),
    );
    expect(
      lottieTraffic,
      `AC-2.7: under prefers-reduced-motion zero player/WASM/lottie-JSON traffic is allowed; got: ${lottieTraffic.join(', ')}`,
    ).toEqual([]);
    expect(await page.locator('canvas').count(), 'expected zero Lottie canvases under reduced motion').toBe(0);
    await assertNoThirdParty(page, seen);
  });
});
