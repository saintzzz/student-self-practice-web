#!/usr/bin/env node
/**
 * artgen lane: bing.com/images/create (MAI-Image / DALL-E backend) via
 * playwright-cli's persistent Microsoft session. Same contract as
 * run-gemini.mjs / run-pollinations.mjs:
 *   node scripts/artgen/run-bing.mjs --manifest=manifest-remaining.mjs [--headless]
 * - artgen-out/{id}.png is the completion marker; whoever finishes first wins.
 * - Sequential single-worker: Bing serializes generation per account anyway.
 * - Result imgs surface as https://th.bing.com/th/id/OIG* - fetched raw.
 */
import { chromium } from 'playwright';
import { existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROFILE = join(HERE, '..', 'azure-web-profile');
const OUT = join(HERE, '..', '..', 'artgen-out');
const APP = 'https://www.bing.com/images/create';
const GEN_WAIT_MS = 180_000;

const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
if (!manifestArg) { console.error('need --manifest=<file>'); process.exit(1); }
const { ASSETS } = await import(`./${manifestArg.split('=')[1]}`);
const headless = process.argv.includes('--headless');

const PROMPT_TAIL =
  ' bright friendly candy colors, centered single composition on a pure white' +
  ' background, no text, no letters, no watermark. Kawaii-cute sticker style' +
  ' for a Vietnamese kids English-learning app, ages 6-11.';

function dimsOf(buf) {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) return buf.readUInt32BE(16);
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let o = 2;
      while (o + 9 < buf.length) {
        if (buf[o] !== 0xff) { o++; continue; }
        const m = buf[o + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
          return buf.readUInt16BE(o + 7);
        o += 2 + buf.readUInt16BE(o + 2);
      }
      return 0;
    }
    if (buf.toString('ascii', 0, 4) === 'RIFF') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8X') return buf.readUIntLE(24, 3) + 1;
      if (fmt === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
      if (fmt === 'VP8L') return (buf.readUInt32LE(21) & 0x3fff) + 1;
    }
  } catch { }
  return 0;
}

const isImage = (buf) => buf.length > 12 &&
  ((buf[0] === 0x89 && buf[1] === 0x50) ||
   (buf[0] === 0xff && buf[1] === 0xd8) ||
   (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'));

const todo = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
console.log(`[artgen-bing] ${todo.length} asset(s)`);
if (!todo.length) process.exit(0);

const seen = new Set(readdirSync(OUT)
  .filter((f) => f.endsWith('.png'))
  .map((f) => createHash('md5').update(readFileSync(join(OUT, f))).digest('hex')));

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless, viewport: { width: 1280, height: 900 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

async function signInGate() {
  // If a sign-in modal/CTA appears, click "Sign in & Keep Creating" /
  // "Đăng nhập" - Microsoft SSO from the azure session usually completes it.
  const t = await page.evaluate(() => document.body?.innerText ?? '');
  if (/sign in & (keep )?creating|đăng nhập/i.test(t)) {
    await page.evaluate(() => {
      [...document.querySelectorAll('button,a')]
        .find((b) => /sign in|đăng nhập/i.test(b.innerText))?.click();
    }).catch(() => {});
    await page.waitForTimeout(12_000);
  }
}

let done = 0, fails = 0;
for (const a of todo) {
  if (existsSync(join(OUT, `${a.id}.png`))) { done++; continue; } // another lane won
  try {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await signInGate();
    // wait for the prompt box to actually attach - SSR renders it late
    await page.getByRole('textbox', { name: /describe the image/i })
      .first().waitFor({ state: 'visible', timeout: 30_000 })
      .catch(async () => {
        await page.locator('[role="textbox"], textarea').first()
          .waitFor({ state: 'visible', timeout: 15_000 });
      });
    const promptBox = page.getByRole('textbox', { name: /describe the image/i }).first();
    await promptBox.fill(`${a.prompt},${PROMPT_TAIL}`).catch(async () => {
      await page.locator('[role="textbox"], textarea').first()
        .fill(`${a.prompt},${PROMPT_TAIL}`);
    });
    // image responses arrive on th.bing.com/th/id/OIG*
    let imgUrl = null;
    const onRes = (res) => {
      const u = res.url();
      if (/th\.bing\.com\/th\/id\/OIG/.test(u)) imgUrl ??= u;
    };
    page.on('response', onRes);
    await page.getByRole('button', { name: /^generate$|^tạo$/i }).first()
      .click({ timeout: 15_000 })
      .catch(() => page.keyboard.press('Enter'));
    const t0 = Date.now();
    while (!imgUrl && Date.now() - t0 < GEN_WAIT_MS) {
      const st = await page.evaluate(() => {
        const t = document.body?.innerText ?? '';
        if (/try again later|đạt giới hạn|limit reached|slow down|too many requests/i.test(t)) return 'limited';
        return null;
      });
      if (st === 'limited') break;
      await page.waitForTimeout(3000);
    }
    page.off('response', onRes);
    if (!imgUrl) {
      console.log(`[b] ${a.id}: ${Date.now() - t0 < GEN_WAIT_MS ? 'limited - pause 30min' : 'timeout'}`);
      if (Date.now() - t0 < GEN_WAIT_MS) { await page.waitForTimeout(30 * 60_000); }
      continue; // requeue implicitly: file still absent next loop? no - push back
    }
    const res = await ctx.request.get(imgUrl);
    const buf = res.ok() ? Buffer.from(await res.body()) : null;
    const h = buf && createHash('md5').update(buf).digest('hex');
    const d = buf && dimsOf(buf);
    if (!buf || !isImage(buf) || d < 512 || seen.has(h)) {
      console.log(`[b] ${a.id}: bad-gen (${buf?.length ?? 0}b dims=${d})`);
      continue;
    }
    seen.add(h);
    writeFileSync(join(OUT, `${a.id}.png`), buf);
    console.log(`[b] ${a.id}: saved (${++done}/${todo.length})`);
    await page.waitForTimeout(4000);
  } catch (e) {
    console.log(`[b] ${a.id}: FAIL ${String(e.message ?? e).split('\n')[0]}`);
    if (++fails > 6) { console.log('[artgen-bing] too many fails - exit'); break; }
    await page.waitForTimeout(10_000);
  }
}
console.log(`[artgen-bing] done - ${done}/${todo.length}`);
await ctx.close();
process.exit(0);
