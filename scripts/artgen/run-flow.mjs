#!/usr/bin/env node
/**
 * Google Flow (flow.google.com) image-generation driver.
 *
 *   node scripts/artgen/run-flow.mjs [--manifest=manifest-cr148.mjs]
 *
 * Attaches to the user's REAL signed-in Chrome over CDP (port 9222 - launch
 * Chrome with --remote-debugging-port=9222 and log into Flow once by hand).
 * For each manifest asset missing artgen-out/{id}.png: type the prompt into
 * the project session composer, submit, wait for new flow.google.com/asb/
 * images, download the first one as PNG. Resume-safe via the PNG marker.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
const manifestFile = manifestArg ? manifestArg.split('=')[1] : 'manifest-cr148.mjs';
const { ASSETS } = await import(`./${manifestFile}`);
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const CDP = process.env.CDP || 'http://localhost:9222';
const GEN_WAIT_MS = 180_000;
const BETWEEN_MS = 4_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function asbSrcs(page) {
  return page.evaluate(
    () => [...document.querySelectorAll('img')]
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
  await page.locator('[aria-label="Bắt đầu tạo"], [aria-label="Start creating"], [aria-label*="tạo"]').last().click();
}

async function waitNewImage(page, preSrcs) {
  const deadline = Date.now() + GEN_WAIT_MS;
  let lastPick = '';
  while (Date.now() < deadline) {
    const pick = await page.evaluate((pre) => {
      const fresh = [...document.querySelectorAll('img')].filter(
        (i) => i.src.includes('/asb/') && !pre.includes(i.src) && i.complete && i.naturalWidth >= 128);
      const best = fresh[0];
      if (!best) {
        const stopped = !document.querySelector('[aria-label="Dừng"], [aria-label="Stop"]');
        const tail = (document.body?.innerText ?? '').replace(/\s+/g, ' ').slice(-400);
        return stopped ? { err: tail } : null;
      }
      return { src: best.src, w: best.naturalWidth, h: best.naturalHeight };
    }, preSrcs);
    if (pick?.src) {
      if (pick.src === lastPick) {
        // x2 outputs: the second variant can land late - if it arrives
        // after the next asset's pre-snapshot it gets misattributed to
        // that asset. Require generation COMPLETE (Stop button gone) +
        // buffer; a settle timeout ABORTS the run (r246/r247) - the
        // asset keeps no marker and a rerun resumes cleanly, while a
        // "skip and continue" would still let the late output poison
        // the NEXT asset's candidate set.
        const settleEnd = Date.now() + 120_000;
        let generating = true;
        while (Date.now() < settleEnd) {
          generating = await page.evaluate(
            () => !!document.querySelector('[aria-label="Dừng"], [aria-label="Stop"]'));
          if (!generating) break;
          await sleep(1500);
        }
        if (generating) {
          const e = new Error('settle timeout - generation still active, run aborted');
          e.fatal = true;
          throw e;
        }
        await sleep(4000);
        return pick;
      }
      lastPick = pick.src;
    }
    if (pick?.err && Date.now() > deadline - GEN_WAIT_MS + 60_000) {
      // Generation finished with no image - capture the agent's answer.
      return { err: pick.err };
    }
    await sleep(2500);
  }
  const tail = await page.evaluate(() => (document.body?.innerText ?? '').slice(-500));
  return { err: `timeout. tail=${JSON.stringify(tail)}` };
}

async function download(page, src, file) {
  const b64 = await page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'include' });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    return btoa(bin);
  }, src);
  writeFileSync(file, Buffer.from(b64, 'base64'));
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes('flow.google.com/project'));
  if (!page) {
    page = await ctx.newPage();
    await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' });
    console.log('[flow] no project tab - open one and rerun');
    return;
  }
  // Reload so any open sub-panel (agent settings etc.) resets to the
  // session view with a live composer.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.ProseMirror').first().waitFor({ timeout: 20000 });
  await sleep(1500);

  for (let pass = 0; pass < 4; pass++) {
    const missing = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
    if (!missing.length) break;
    console.log(`[flow] pass ${pass + 1}: ${missing.length} missing`);
    for (const a of missing) {
      const file = join(OUT, `${a.id}.png`);
      try {
        const pre = await asbSrcs(page);
        await submit(page, a.prompt);
        const got = await waitNewImage(page, pre);
        if (!got.src) { console.log(`[flow] ${a.id}: ${got.err}`); continue; }
        await download(page, got.src, file);
        console.log(`[flow] ${a.id}: ${got.w}x${got.h} saved`);
      } catch (e) {
        if (e.fatal) throw e; // propagate past the per-asset catch (r247)
        console.log(`[flow] ${a.id}: FAIL ${e.message?.slice(0, 160)}`);
      }
      await sleep(BETWEEN_MS);
    }
  }
  const left = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
  console.log(`[flow] done. ${ASSETS.length - left.length}/${ASSETS.length} on disk, ${left.length} left: ${left.map((a) => a.id).join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
