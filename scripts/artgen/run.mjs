#!/usr/bin/env node
/**
 * ChatGPT-web image generation driver.
 *
 *   node scripts/artgen/run.mjs --login        open browser, log in once (manual)
 *   node scripts/artgen/run.mjs --gen [id...]  generate manifest assets
 *
 * Uses a persistent Chromium profile OUTSIDE the repo (~/.vieschool-artgen/)
 * so Vite's file watcher never trips on locked Chrome profile files.
 * For each asset: new chat -> prompt -> wait for the generated image ->
 * download via signed URL -> artgen-out/{id}.png.
 * Resize/convert to webp happens in resize.py (PIL).
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { ASSETS } from './manifest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROFILE = join(homedir(), '.vieschool-artgen', 'profile');
const OUT = join(HERE, '..', '..', 'artgen-out');
const URL_CHAT = 'https://chatgpt.com/';
mkdirSync(OUT, { recursive: true });

const COMPOSER = '#prompt-textarea, div[contenteditable="true"], textarea[placeholder*="Ask"], form textarea';
const IMG_WAIT_MS = 240_000;

async function isLoggedIn(page) {
  // Anonymous users also get a composer - the real signal is the absence of
  // a "Log in" CTA plus a profile/avatar control.
  const loginCta = await page.evaluate(() =>
    [...document.querySelectorAll('button, a')].some((e) => /log\s*in/i.test(e.textContent ?? '')));
  return !loginCta;
}

async function dismissCookies(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((e) => /accept/i.test(e.textContent ?? ''))?.click();
    [...document.querySelectorAll('div')].filter((e) => e.id.includes('cookie') || e.className.includes('cookie'))
      .forEach((e) => { e.style.display = 'none'; });
  });
}

async function waitLoggedIn(page, timeoutMs = 20 * 60_000) {
  const t0 = Date.now();
  let dumped = false;
  while (Date.now() - t0 < timeoutMs) {
    await dismissCookies(page).catch(() => {});
    if ((await page.locator(COMPOSER).count()) && (await isLoggedIn(page))) return true;
    if (!dumped && Date.now() - t0 > 60_000) {
      dumped = true;
      const snap = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 300),
      }));
      console.log('[artgen] 60s snapshot:', JSON.stringify(snap, null, 1));
    }
    await page.waitForTimeout(1500);
  }
  return false;
}

async function newChat(page) {
  // Hard navigation - sidebar "New chat" clicks proved flaky: failed
  // navigation stacked prompts into one chat and ChatGPT answered them
  // with merged collage images. goto guarantees a clean composer.
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
  await page.locator(COMPOSER).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
}

async function generate(page, prompt) {
  // Snapshot existing image srcs so a stale img from a previous chat can
  // never satisfy the wait (root cause of the 7-file duplicate bug).
  const preSrcs = await page.evaluate(
    () => [...document.querySelectorAll('img')].map((i) => i.src));
  const box = page.locator(COMPOSER).first();
  await box.click();
  await page.keyboard.type(prompt, { delay: 4 });
  await page.keyboard.press('Enter');
  // Wait for a NEW generated <img>: blob: src, not in the pre-prompt
  // snapshot, naturalWidth >= 256, stable across two polls. Prefer the
  // LAST blob img in the document (newest assistant message).
  const deadline = Date.now() + IMG_WAIT_MS;
  let lastSrc = '';
  while (Date.now() < deadline) {
    const info = await page.evaluate((pre) => {
      const imgs = [...document.querySelectorAll('img')];
      const fresh = imgs.filter(
        (i) => i.src.startsWith('blob:') && !pre.includes(i.src)
          && i.complete && i.naturalWidth >= 256);
      const pick = fresh.at(-1);
      if (!pick) return null;
      return { idx: imgs.indexOf(pick), src: pick.src, w: pick.naturalWidth };
    }, preSrcs);
    if (info && info.src === lastSrc) return info.idx;
    if (info?.src) lastSrc = info.src;
    await page.waitForTimeout(2500);
  }
  throw new Error('image timeout');
}

async function main() {
  const args = process.argv.slice(2);
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(URL_CHAT, { waitUntil: 'domcontentloaded' });

  console.log('[artgen] waiting for ChatGPT session - log in in the browser window if needed');
  if (!(await waitLoggedIn(page))) {
    console.log('[artgen] login timeout - rerun with --login');
    await ctx.close();
    process.exit(1);
  }
  console.log('[artgen] session OK');

  if (args[0] === '--login') { await ctx.close(); return; }

  const want = args.filter((a) => !a.startsWith('--'));
  const todo = ASSETS.filter((a) => (want.length ? want.includes(a.id) : true))
    .filter((a) => !existsSync(join(OUT, `${a.id}.png`)));

  console.log(`[artgen] ${todo.length} asset(s) to generate`);
  for (const a of todo) {
    console.log(`[artgen] ${a.id}: prompting...`);
    try {
      await newChat(page);
      const imgIdx = await generate(page, a.prompt);
      // blob: URLs are page-scoped - pull the bytes via <img> inside the
      // page (canvas readback would be cleaner but images may be cross-
      // origin-tainted in some UI states; fetch on the blob URL is
      // same-origin and preserves the file as generated).
      const b64 = await page.evaluate(async (idx) => {
        const img = [...document.querySelectorAll('img')][idx];
        const res = await fetch(img.src);
        const buf = await res.arrayBuffer();
        let bin = '';
        new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
        return btoa(bin);
      }, imgIdx);
      writeFileSync(join(OUT, `${a.id}.png`), Buffer.from(b64, 'base64'));
      console.log(`[artgen] ${a.id}: saved`);
    } catch (e) {
      console.log(`[artgen] ${a.id}: FAIL ${e.message}`);
    }
    await page.waitForTimeout(2000);
  }
  await ctx.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
