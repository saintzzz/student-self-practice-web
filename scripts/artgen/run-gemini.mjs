#!/usr/bin/env node
/**
 * Gemini-web image generation driver - same manifest/output contract as
 * run.mjs (ChatGPT web) so the two can run in parallel on the same queue.
 * artgen-out/{id}.png is the done marker - whichever provider finishes
 * first wins; the other skips it (checked right before prompting too).
 *
 *   node scripts/artgen/run.mjs        --gen --manifest=manifest-remaining.mjs --workers=2
 *   node scripts/artgen/run-gemini.mjs --gen --manifest=manifest-remaining.mjs --workers=2
 *
 * Auth: persistent profile scripts/gemini-web-profile (headed - Google
 * /sorry/-walls headless automation at IP level). Profile cookie jar is
 * seeded from scripts/gemini-auth.json when empty.
 * Byte capture: listen for the generated image's network RESPONSE and
 * take its body (original resolution). Fallback: request.get on the
 * <img> src with the googleusercontent =s size param bumped.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
if (!manifestArg) { console.error('need --manifest=<file>'); process.exit(1); }
const { ASSETS } = await import(`./${manifestArg.split('=')[1]}`);

const HERE = dirname(fileURLToPath(import.meta.url));
const AUTH = join(HERE, '..', 'gemini-auth.json');
const PROFILE = join(HERE, '..', 'gemini-web-profile');
const CORE = /^(SID|HSID|SSID|__Secure-[13]PSID)$/;
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
const APP = 'https://gemini.google.com/app';
const IMG_WAIT_MS = 240_000;

// Returns 'ok' | 'dead'. google /sorry/ = IP-level bot wall: keep the
// (headed) page on it so a human captcha solve unblocks, poll until clear.
async function waitReady(page) {
  let captchaNoted = false;
  for (;;) {
    const url = page.url();
    if (/\/sorry\//.test(url)) {
      if (!captchaNoted) {
        console.log('[artgen-gemini] google /sorry/ wall - giai captcha trong cua so (hoac cho IP cooldown), auto-resume');
        captchaNoted = true;
      }
      await page.waitForTimeout(30_000);
      continue; // do NOT goto - that would reload over a captcha being solved
    }
    captchaNoted = false;
    if (/accounts\.google\.com/.test(url)) return 'dead';
    if (await page.locator(INPUT).first().count()) return 'ok';
    const txt = await page.evaluate(() => document.body?.innerText ?? '');
    if (/sign\s*in|đăng nhập/i.test(txt)) return 'dead';
    await page.waitForTimeout(5000);
  }
}

async function newChat(page) {
  if (!/\/sorry\//.test(page.url())) {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
  }
  if ((await waitReady(page)) !== 'ok') throw new Error('session-dead');
  await page.waitForTimeout(1200);
}

async function generate(page, prompt) {
  // Collect large image responses that arrive AFTER the prompt - the
  // generated art is the biggest image payload in the chat.
  const hits = [];
  const onRes = async (res) => {
    try {
      if (!/image\//.test(res.headers()['content-type'] ?? '')) return;
      const u = res.url();
      if (!/googleusercontent|ggpht|gstatic/.test(u)) return;
      const len = Number(res.headers()['content-length'] ?? 0);
      hits.push({ u, len });
    } catch { }
  };
  page.on('response', onRes);
  try {
    const box = page.locator(INPUT).first();
    await box.click();
    await page.keyboard.insertText(`Generate an image. ${prompt}`);
    await page.keyboard.press('Enter');
    const deadline = Date.now() + IMG_WAIT_MS;
    let best = null;
    while (Date.now() < deadline) {
      // rate-limit / quota surfaces as UI copy
      const limited = await page.evaluate(() => {
        const t = document.body?.innerText ?? '';
        // VI quota copy: "Hạn mức của bạn sẽ được đặt lại lúc 6:30 CH"
        const vm = t.match(/đặt lại lúc (\d{1,2}):(\d{2})\s*(SA|CH)/i);
        if (vm) {
          const now = new Date();
          const h = Number(vm[1]) % 12 + (/CH/i.test(vm[3]) ? 12 : 0);
          const reset = new Date(now); reset.setHours(h, Number(vm[2]), 0, 0);
          if (reset <= now) reset.setDate(reset.getDate() + 1);
          return { resetMs: reset - now };
        }
        if (/hạn mức|limit resets|create more images as soon as/i.test(t))
          return { resetMs: 60 * 60_000 };
        if (/reached your (usage |)limit|try again (later|tomorrow|in)|rate.?limit|quota|too many requests|giới hạn/i.test(t))
          return { resetMs: 30 * 60_000 };
        const m = t.match(/try again in (\d+)\s*(hour|minute)/i);
        if (m) return { resetMs: Number(m[1]) * (/hour/i.test(m[2]) ? 3600_000 : 60_000) };
        return null;
      });
      if (limited) {
        const e = new Error('rate-limited');
        e.resetMs = limited.resetMs;
        throw e;
      }
      // a response body >40KB is almost certainly the generated art;
      // content-length can be absent (chunked) - then the LAST hit wins
      hits.sort((a, b) => b.len - a.len);
      if (hits.length && hits[0].len > 40_000) best = hits[0];
      else if (hits.length) {
        // no content-length: confirm a matching large <img> exists first
        const u = hits[hits.length - 1].u;
        const ok = await page.evaluate(
          (url) => [...document.querySelectorAll('img')].some((i) => i.src === url && i.naturalWidth >= 256),
          u);
        if (ok) best = { u };
      }
      if (best) return best.u;
      // fallback signal: a big <img> inside the response
      const src = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('message-content img, .model-response-text img, img')];
        const pick = imgs.filter((i) => i.complete && i.naturalWidth >= 512 && /googleusercontent|ggpht/.test(i.src)).at(-1);
        return pick?.src ?? null;
      });
      if (src) return src;
      await page.waitForTimeout(2500);
    }
    const tail = await page.evaluate(() => document.body?.innerText?.slice(-400) ?? '');
    console.log(`[artgen-gemini] timeout tail: ${JSON.stringify(tail)}`);
    throw new Error('image timeout');
  } finally {
    page.off('response', onRes);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const headless = args.includes('--headless'); // headed by default - /sorry/ needs a human-able window
  const workersArg = args.find((a) => a.startsWith('--workers='));
  const WORKERS = Math.max(1, Math.min(4, Number(workersArg?.split('=')[1]) || 1));
  const todo = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
  console.log(`[artgen-gemini] ${todo.length} asset(s) on ${WORKERS} worker(s)`);
  if (!todo.length) return;

  // Persistent profile: cookies survive restarts; headed so a captcha can
  // be solved in-window. Seed the jar from auth.json when empty.
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless,
    viewport: { width: 1200, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  if (!(await ctx.cookies()).some((c) => CORE.test(c.name) && c.domain.includes('google')) && existsSync(AUTH)) {
    const st = JSON.parse(readFileSync(AUTH, 'utf8'));
    await ctx.addCookies(st.cookies.filter((c) => c.domain.includes('google')));
    console.log('[artgen-gemini] seeded profile cookies from auth.json');
  }
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const ready = await waitReady(page);
  if (ready !== 'ok') {
    console.log('[artgen-gemini] session dead - rerun scripts/gemini-login.mjs');
    await ctx.close();
    process.exit(1);
  }
  console.log('[artgen-gemini] session OK');

  const queue = [...todo];
  let pauseUntil = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wrong-image guard: gemini sometimes answers with a recurring
  // promo/icon image instead of generating - identical bytes across
  // different ids is the tell. Real 1024px gens are all >300KB anyway.
  const seen = new Set();
  const { createHash } = await import('node:crypto');
  for (const f of readdirSync(OUT).filter((x) => x.endsWith('.png')))
    seen.add(createHash('md5').update(readFileSync(join(OUT, f))).digest('hex'));

  async function worker(idx) {
    const wpage = idx === 0 ? page : await ctx.newPage();
    for (;;) {
      if (Date.now() < pauseUntil) { await sleep(Math.min(30_000, pauseUntil - Date.now())); continue; }
      const a = queue.shift();
      if (!a) return;
      // the ChatGPT worker may have landed this asset while we queued
      if (existsSync(join(OUT, `${a.id}.png`))) continue;
      a._tries = (a._tries ?? 0) + 1;
      console.log(`[g${idx}] ${a.id}: prompting...`);
      try {
        await newChat(wpage);
        const src = await generate(wpage, a.prompt);
        // original-resolution fetch: bump googleusercontent size param
        const full = src.replace(/=s\d+(-[^/]*)?$/, '=s1024$1');
        const res = await wpage.context().request.get(full).catch(() => null);
        let buf = res?.ok() ? Buffer.from(await res.body()) : null;
        if (!buf || buf.length < 10_000) {
          // fallback: screenshot the rendered img (downscaled but valid)
          const shot = await wpage.evaluate((u) => {
            const i = [...document.querySelectorAll('img')].find((x) => x.src === u);
            if (!i) return null;
            const c = document.createElement('canvas');
            c.width = i.naturalWidth; c.height = i.naturalHeight;
            c.getContext('2d').drawImage(i, 0, 0);
            try { return c.toDataURL('image/png'); } catch { return null; }
          }, src);
          if (!shot) throw new Error('no byte path');
          buf = Buffer.from(shot.split(',')[1], 'base64');
        }
        const h = createHash('md5').update(buf).digest('hex');
        // gemini serves JPEG/WebP (45-180KB @1024px is normal) - size alone
        // is a bad proxy. Require real image magic + big rendered dims.
        const magic = buf.length > 12 &&
          (buf[0] === 0x89 && buf[1] === 0x50 ||                    // PNG
           buf[0] === 0xff && buf[1] === 0xd8 ||                    // JPEG
           buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP');
        // DOM src matching is flaky after re-render - decode dims from the
        // buffer headers instead (PNG IHDR / JPEG SOF / WebP VP8*).
        const dims = (() => {
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
              if (fmt === 'VP8X') return (buf.readUIntLE(24, 3) + 1);
              if (fmt === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
              if (fmt === 'VP8L') return (buf.readUInt32LE(21) & 0x3fff) + 1;
            }
          } catch { }
          return 0;
        })();
        if (!magic || buf.length < 40_000 || dims < 512 || seen.has(h)) {
          a._tries = Math.max(0, a._tries - 1); // don't burn a retry on bad-gen
          queue.push(a);
          const why = [!magic && 'magic', buf.length < 40_000 && 'size', dims < 512 && `dims=${dims}`, seen.has(h) && 'dup'].filter(Boolean).join(',');
          console.log(`[g${idx}] ${a.id}: bad-gen (${buf.length}b ${why}) - requeued`);
          await wpage.waitForTimeout(5000);
          continue;
        }
        seen.add(h);
        writeFileSync(join(OUT, `${a.id}.png`), buf);
        console.log(`[g${idx}] ${a.id}: saved (${todo.length - queue.length}/${todo.length})`);
      } catch (e) {
        if (e.message === 'session-dead') {
          pauseUntil = Math.max(pauseUntil, Date.now() + 60_000);
          queue.unshift(a);
          console.log(`[g${idx}] ${a.id}: session-dead - pause 60s`);
        } else if (e.message === 'rate-limited' && a._tries < 4) {
          const wait = e.resetMs ?? 90_000;
          pauseUntil = Math.max(pauseUntil, Date.now() + wait);
          queue.unshift(a);
          console.log(`[g${idx}] ${a.id}: RATE-LIMITED - pause ${Math.round(wait / 60000)}min (try ${a._tries}/4)`);
        } else {
          console.log(`[g${idx}] ${a.id}: FAIL ${e.message}`);
        }
      }
      await wpage.waitForTimeout(6000);
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  await ctx.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
