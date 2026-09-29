#!/usr/bin/env node
/**
 * check-bundle-budget - AC-2.10 entry budget gate.
 * Entry JS gzip <= 94.5 kB, entry CSS gzip <= 6.25 kB
 * (baseline 84.46 / 5.20 kB + headroom, measured with gzip level 9).
 * CSS baseline re-based for CR-09 (AC-UI6): +1.24 kB is the Baloo 2
 * @font-face rules + design-token utilities; headroom kept at ~1 kB.
 * Run after `npm run build`.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const JS_MAX_KB = 94.5;
const CSS_MAX_KB = 6.25;
const BASELINE = { js: 84.46, css: 5.2 };

const kb = (buf) => gzipSync(buf, { level: 9 }).length / 1024;

async function main() {
  const htmlPath = path.join(DIST, 'index.html');
  if (!existsSync(htmlPath)) {
    console.error('check-bundle-budget: dist/index.html missing - run `npm run build` first');
    process.exit(1);
  }
  const html = await readFile(htmlPath, 'utf8');
  const jsSrc = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
  const cssHref = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/)?.[1];
  if (!jsSrc || !cssHref) {
    console.error(`check-bundle-budget: could not locate entry assets (js=${jsSrc}, css=${cssHref})`);
    process.exit(1);
  }

  const results = [];
  let failed = false;
  for (const [kind, href, max] of [
    ['js', jsSrc, JS_MAX_KB],
    ['css', cssHref, CSS_MAX_KB],
  ]) {
    const file = path.join(DIST, href.replace(/^\//, ''));
    const size = kb(await readFile(file));
    const ok = size <= max;
    if (!ok) failed = true;
    results.push(
      `${kind.toUpperCase()} ${path.basename(file)}: ${size.toFixed(2)} kB (baseline ${BASELINE[kind]}, max ${max}, delta +${(size - BASELINE[kind]).toFixed(2)}) ${ok ? 'OK' : 'OVER BUDGET'}`,
    );
  }
  const entryJs = await readFile(path.join(DIST, jsSrc.replace(/^\//, '')));
  // AC-2.5: the dotlottie runtime package code and WASM asset URL must live
  // in the lazy chunk, never in the entry chunk. (The lazy import's chunk
  // filename "EmojiLottiePlayer-*.js" legitimately appears in the entry's
  // import map - that IS the seam, not a leak.)
  const leaked = ['dotlottie', '.wasm'].filter((s) => entryJs.includes(s));
  if (leaked.length > 0) {
    failed = true;
    results.push(
      `ENTRY CHUNK contains lottie runtime refs (${leaked.join(', ')}) - OVER BUDGET (AC-2.5: player/WASM must lazy-load)`,
    );
  } else {
    results.push('ENTRY CHUNK lottie-runtime-free (AC-2.5) OK');
  }
  console.log(results.join('\n'));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
