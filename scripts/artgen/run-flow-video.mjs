#!/usr/bin/env node
/**
 * Google Flow VIDEO driver (Veo/Omni) - sibling of run-flow.mjs.
 *
 *   node scripts/artgen/run-flow-video.mjs [--manifest=manifest-video.mjs]
 *     [--project=cfedce1d-...]
 *
 * Attaches to the real signed-in Chrome over CDP (port 9222). Runs against a
 * DEDICATED video project tab (agent sessions are linear - sharing the image
 * project would interleave prompts and corrupt attribution). Per asset:
 * snapshot .video-container srcs -> submit prompt -> wait for a NEW video
 * card -> open its editor -> Tải xuống -> 720p -> save mp4 to
 * artgen-out/{id}.mp4 (done-marker, resume-safe).
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
const manifestFile = manifestArg ? manifestArg.split('=')[1] : 'manifest-video.mjs';
const projectArg = process.argv.find((a) => a.startsWith('--project='));
const projectHint = projectArg ? projectArg.split('=')[1] : 'cfedce1d';
const { ASSETS } = await import(`./${manifestFile}`);
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const CDP = process.env.CDP || 'http://localhost:9222';
const GEN_WAIT_MS = 480_000; // video render is slow (~5min observed)
const BETWEEN_MS = 5_000;
const FAIL_BREAKER = 4; // fewer clips - abort fast if quota is out

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function videoCardSrcs(page) {
  return page.evaluate(
    () => [...document.querySelectorAll('.video-container img, [class*=video] img')]
      .map((i) => i.src)
      .filter((s) => s.includes('/asb/'))
  );
}

async function submit(page, prompt) {
  const box = page.locator('.ProseMirror').last();
  await box.click();
  await sleep(400);
  await page.keyboard.type(prompt, { delay: 3 });
  await sleep(300);
  // Transcript boundary BEFORE the click: the typed prompt already sits
  // in the composer so it is counted here; everything appended after
  // submission belongs to this turn only. Capturing post-click could
  // swallow an instant rejection into the boundary itself (r256).
  const boundary = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').length);
  await page.locator('[aria-label="Bắt đầu tạo"], [aria-label="Start creating"]').last().click();
  return boundary;
}

async function waitNewVideoCard(page, preSrcs, boundary) {
  const deadline = Date.now() + GEN_WAIT_MS;
  while (Date.now() < deadline) {
    const pick = await page.evaluate((pre) => {
      const cards = [...document.querySelectorAll('.video-container')];
      const fresh = cards
        .map((c) => ({ el: c, src: c.querySelector('img')?.src ?? '' }))
        .filter((c) => c.src.includes('/asb/') && !pre.includes(c.src));
      if (!fresh.length) return null;
      return { src: fresh[0].src, index: cards.indexOf(fresh[0].el) };
    }, preSrcs);
    if (pick) return pick;
    // A quiet agent does NOT mean failure - it confirms "generation has
    // started" then goes silent while the ~5min render is pending. The
    // only safe early exit is explicit error text; anything else keeps
    // polling, because a late card landing under the NEXT asset's name
    // is the misattribution bug this lane exists to avoid.
    const err = await page.evaluate((b) => {
      const body = (document.body?.innerText ?? '').replace(/\s+/g, ' ');
      if (body.length <= b) return null; // nothing new yet - keep polling
      const tail = body.slice(b);
      return /(lỗi|thử lại|error|try again|unable|không thể)/i.test(tail) ? tail : null;
    }, boundary);
    if (err) return { err, fatal: false };
    await sleep(8000);
  }
  // Timeout is AMBIGUOUS - the render may still land after we give up.
  // Fatal-abort the run instead of starting the next asset (resume-safe).
  return { err: 'timeout waiting for video card', fatal: true };
}

async function downloadVideo(page, cardIndex, file) {
  // Click the NEWEST matching card (index into .video-container list).
  await page.locator('.video-container').nth(cardIndex).click();
  await page.waitForURL(/\/edit\//, { timeout: 20000 });
  await sleep(4000);
  const dlP = page.waitForEvent('download', { timeout: 60000 });
  await page.locator('button:has-text("Tải xuống"), button:has-text("Download")').first().click();
  await sleep(1500);
  await page.locator('text=/^720p/').first().click();
  const dl = await dlP;
  await dl.saveAs(file);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.locator('.ProseMirror').first().waitFor({ timeout: 20000 });
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes(projectHint));
  if (!page) {
    console.log(`[flow-video] no tab matching ${projectHint} - open the video project first`);
    return;
  }
  // projectHint may be only an id prefix - resolve the FULL session URL
  // from the matched tab before any goto() (a truncated id navigates
  // away from the real project and the composer never mounts).
  let sessionUrl = page.url().match(/https:\/\/flow\.google\.com\/project\/[0-9a-f-]+/i)?.[0];
  if (!sessionUrl && /^[0-9a-f-]{36}$/i.test(projectHint)) {
    sessionUrl = `https://flow.google.com/project/${projectHint}`;
  }
  if (!sessionUrl) {
    // Tab is sitting on /edit/ - step back to the session view for the id.
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    sessionUrl = page.url().match(/https:\/\/flow\.google\.com\/project\/[0-9a-f-]+/i)?.[0];
  }
  if (!sessionUrl) {
    console.log('[flow-video] cannot resolve project URL - pass --project=<full uuid>');
    return;
  }
  // The tab may be sitting on an /edit/ page from a previous download -
  // always return to the session view first (composer lives there).
  await page.goto(sessionUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.ProseMirror').first().waitFor({ timeout: 20000 });
  await sleep(1500);

  let consecFails = 0;
  for (const a of ASSETS) {
    const file = join(OUT, `${a.id}.mp4`);
    if (existsSync(file)) continue;
    try {
      await Promise.race([
        (async () => {
          const pre = await videoCardSrcs(page);
          const boundary = await submit(page, a.prompt);
          const got = await waitNewVideoCard(page, pre, boundary);
          if (!got.src) {
            if (got.fatal) {
              const e = new Error(got.err);
              e.fatal = true;
              throw e;
            }
            consecFails++;
            console.log(`[flow-video] ${a.id}: ${got.err}`);
            return;
          }
          await downloadVideo(page, got.index, file);
          consecFails = 0;
          console.log(`[flow-video] ${a.id}: saved`);
        })(),
        sleep(GEN_WAIT_MS + 120_000).then(() => {
          const e = new Error('watchdog - per-asset block hung');
          e.fatal = true;
          throw e;
        }),
      ]);
    } catch (e) {
      consecFails++;
      console.log(`[flow-video] ${a.id}: FAIL ${e.message?.slice(0, 160)}`);
      // Timeout/watchdog while a render may still be pending -> the late
      // card could land under the next asset's name. Abort; resume-safe.
      if (e.fatal) {
        console.log('[flow-video] ambiguous state - aborting run (rerun resumes)');
        return;
      }
      try { await page.goto(sessionUrl, { waitUntil: 'domcontentloaded' }); } catch { /* noop */ }
      await sleep(3000);
    }
    if (consecFails >= FAIL_BREAKER) {
      console.log(`[flow-video] ${consecFails} consecutive failures - quota/session likely out, aborting`);
      return;
    }
    await sleep(BETWEEN_MS);
  }
  const left = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.mp4`)));
  console.log(`[flow-video] done. ${ASSETS.length - left.length}/${ASSETS.length} on disk, left: ${left.map((a) => a.id).join(', ') || 'none'}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
