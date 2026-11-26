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
  await page.locator('[aria-label="Bắt đầu tạo"], [aria-label="Start creating"]').last().click();
}

async function waitNewVideoCard(page, preSrcs) {
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
    // Agent finished without producing a card -> error text.
    const done = await page.evaluate(() => {
      const stopped = !document.querySelector('[aria-label="Dừng"], [aria-label="Stop"]');
      const tail = (document.body?.innerText ?? '').replace(/\s+/g, ' ').slice(-300);
      return stopped ? tail : null;
    });
    // The agent answers "generation has started" BEFORE the card lands -
    // an early all-quiet does not mean failure; only treat as error once
    // a second quiet stretch confirms it (~90s).
    if (done && Date.now() > deadline - GEN_WAIT_MS + 90_000) return { err: done };
    await sleep(8000);
  }
  return { err: 'timeout waiting for video card' };
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
  // The tab may be sitting on an /edit/ page from a previous download -
  // always return to the session view first (composer lives there).
  await page.goto(`https://flow.google.com/project/${projectHint}`, { waitUntil: 'domcontentloaded' });
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
          await submit(page, a.prompt);
          const got = await waitNewVideoCard(page, pre);
          if (!got.src) {
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
          e.watchdog = true;
          throw e;
        }),
      ]);
    } catch (e) {
      consecFails++;
      console.log(`[flow-video] ${a.id}: FAIL ${e.message?.slice(0, 160)}`);
      try { await page.goto(`https://flow.google.com/project/${projectHint}`, { waitUntil: 'domcontentloaded' }); } catch { /* noop */ }
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
