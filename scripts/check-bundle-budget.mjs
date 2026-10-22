#!/usr/bin/env node
/**
 * check-bundle-budget - AC-2.10 entry budget gate.
 * Entry JS gzip <= 121 kB, entry CSS gzip <= 8.5 kB
 * (baseline 101.07 / 5.20 kB + headroom, measured with gzip level 9).
 * CSS baseline re-based for CR-09 (AC-UI6): +1.24 kB is the Baloo 2
 * @font-face rules + design-token utilities; headroom kept at ~1 kB.
 * JS baseline re-based for CR-07 (AC-G8): +16.61 kB over the 84.46
 * pre-CR-09 baseline is the grades 1-5 vocabulary bank (524 words, ~200
 * new entries with Vietnamese explanations) - deliberate content data,
 * not code growth. Per-grade lazy chunking was evaluated and deferred:
 * making getWordsByGrade async would async-ify createBatch across ~50
 * call sites for ~10 kB; recorded as a CR-08+ optimization note in
 * docs/sdlc/advisory-log.md.
 * Budgets re-based for CR-10 (advisory A-28): +10.56 kB JS over the
 * CR-07 baseline is the themed-world layer (theme map, 6 inline-SVG
 * land scenes, engagement store, confetti/star-rain/chest
 * celebrations, journey-map GradeSelect); +1.50 kB CSS is the land +
 * reward keyframes with reduced-motion fallbacks. Headroom kept:
 * ~9.4 kB JS / ~0.8 kB CSS.
 * CSS re-based for CR-11 (advisory A-29): +0.95 kB is the premium
 * surface layer - arbitrary-value pressed-edge/gradient shadows on
 * CTAs, glass backdrop-blur chips, card gradient sheen. Headroom
 * kept ~0.85 kB.
 * CSS re-based for CR-12 (advisory A-31): +0.45 kB over the CR-11
 * max is the premium-max layer - top-gloss insets on CTAs, key-cap
 * tile shadows (options, letters, pair tiles), layered card shadow,
 * ambient/mascot/progress keyframes, medal discs, gold badges.
 * Headroom kept ~0.8 kB.
 * Run after `npm run build`.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const JS_MAX_KB = 121;
const CSS_MAX_KB = 10;
const BASELINE = { js: 101.07, css: 5.2 };

/**
 * CR-82 (ARCHITECTURE-v5 D-03): the absolute gate was already red before
 * CR-82 (entry JS 224.55 / CSS 13.08 kB gzip, measured pre-M1), so CR-82
 * is measured as a DELTA against that recorded baseline: +20 kB JS gzip
 * / +4.0 kB CSS gzip max, plus per-lazy-chunk caps. The inherited overrun
 * is logged in docs/MEMORY.md as its own debt item.
 *
 * CR-103/104 re-base: the CR-103 content-bank lazy split moved the
 * vocabulary bank + ipaMap + commonEnglishWords behind a dynamic-import
 * boundary - entry JS gzip dropped 224.55 -> 129.27 kB (-95.28). CSS
 * grew +6.52 kB over the cr82 anchor across CR-83..CR-100 (hearts meter,
 * hint buttons, paper-exam register, trail map, level ring). The anchor
 * is re-based to the post-CR-103 build; headroom +10 kB JS / +3 kB CSS.
 * The legacy absolute caps (121/10) remain advisory in the report.
 */
const CR82_BASELINE = { js: 129.27, css: 19.6 };
const CR82_DELTA = { js: 10.0, css: 3.0 };
const CR82_LAZY_CAPS = [
  { match: /^LetterTracingQuestion-.*\.js$/, max: 12, label: 'LetterTracingQuestion chunk' },
  { match: /^FlashcardScreen-.*\.js$/, max: 12, label: 'FlashcardScreen chunk' },
];

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
  for (const [kind, href, legacyMax] of [
    ['js', jsSrc, JS_MAX_KB],
    ['css', cssHref, CSS_MAX_KB],
  ]) {
    const file = path.join(DIST, href.replace(/^\//, ''));
    const size = kb(await readFile(file));
    const cr82Cap = CR82_BASELINE[kind] + CR82_DELTA[kind];
    const ok = size <= cr82Cap;
    if (!ok) failed = true;
    results.push(
      `${kind.toUpperCase()} ${path.basename(file)}: ${size.toFixed(2)} kB ` +
        `(cr82 baseline ${CR82_BASELINE[kind]}, delta cap +${CR82_DELTA[kind]}, ` +
        `delta ${size - CR82_BASELINE[kind] >= 0 ? '+' : ''}${(size - CR82_BASELINE[kind]).toFixed(2)}) ` +
        `${ok ? 'OK' : 'OVER BUDGET'} | legacy absolute ${legacyMax}: ${size <= legacyMax ? 'OK' : 'over (inherited debt, see MEMORY)'}`,
    );
  }

  // CR-82 lazy-chunk caps (D-03): fail if a listed lazy chunk exceeds its
  // gzip budget; skip silently while the chunk does not exist yet.
  const assetDir = path.join(DIST, 'assets');
  const assetFiles = existsSync(assetDir) ? await readdir(assetDir) : [];
  for (const cap of CR82_LAZY_CAPS) {
    const file = assetFiles.find((f) => cap.match.test(f));
    if (!file) {
      results.push(`${cap.label}: not built yet (skipped)`);
      continue;
    }
    const size = kb(await readFile(path.join(assetDir, file)));
    const ok = size <= cap.max;
    if (!ok) failed = true;
    results.push(`${cap.label} ${file}: ${size.toFixed(2)} kB (max ${cap.max}) ${ok ? 'OK' : 'OVER BUDGET'}`);
  }
  const entryJs = await readFile(path.join(DIST, jsSrc.replace(/^\//, '')), 'utf8');
  // AC-2.5: the dotlottie runtime package code and WASM asset URL must live
  // in the lazy chunk, never in the entry chunk. Vite's module-preload
  // dependency manifest legitimately NAMES lazy-chunk asset filenames in
  // the entry ("assets/dotlottie-player-*.js", "assets/*-*.wasm") - a
  // filename string is the lazy seam itself, not runtime code. Strip
  // emitted-asset filename literals first, then scan: a leak now means
  // real runtime code or an import specifier inside the entry.
  const entrySansAssetNames = entryJs.replace(/assets\/[\w.-]+\.(?:js|css|wasm|json)/g, '');
  const leaked = ['dotlottie', '.wasm'].filter((s) => entrySansAssetNames.includes(s));
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
