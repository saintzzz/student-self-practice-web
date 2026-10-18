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
  const btn = page.locator('a[href="/"], button:has-text("New chat"), [data-testid="create-new-chat-button"]').first();
  if (await btn.count()) await btn.click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.locator(COMPOSER).first().waitFor({ timeout: 15000 });
}

async function generate(page, prompt) {
  const box = page.locator(COMPOSER).first();
  await box.click();
  await page.keyboard.type(prompt, { delay: 4 });
  await page.keyboard.press('Enter');
  // Wait for an <img> inside the latest assistant turn that is fully loaded.
  const deadline = Date.now() + IMG_WAIT_MS;
  let lastSrc = '';
  while (Date.now() < deadline) {
    const info = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('[data-message-author-role="assistant"] img, article img')];
      const img = imgs.at(-1);
      if (!img) return null;
      return { src: img.src, ok: img.complete && img.naturalWidth > 0, w: img.naturalWidth };
    });
    if (info?.ok && info.w >= 256 && info.src === lastSrc) return info.src; // src stable = final
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
      const src = await generate(page, a.prompt);
      const res = await ctx.request.get(src);
      if (!res.ok()) throw new Error(`download ${res.status()}`);
      writeFileSync(join(OUT, `${a.id}.png`), Buffer.from(await res.body()));
      console.log(`[artgen] ${a.id}: saved`);
    } catch (e) {
      console.log(`[artgen] ${a.id}: FAIL ${e.message}`);
    }
    await page.waitForTimeout(2000);
  }
  await ctx.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
