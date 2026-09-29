#!/usr/bin/env node
/**
 * assets:emoji - fetch and vendor emoji art (ADR-3/ADR-4, US-4).
 *
 *   1. Enumerate every distinct emoji in src/data/vocabulary/*.ts plus the
 *      mascot literals 🐷 ✨ 🎉, convert to Twemoji keys.
 *   2. Fetch Twemoji SVG per key into public/emoji/svg/{key}.svg.
 *   3. Fetch the Noto Animated Emoji index, keep keys we use, download
 *      each lottie.json into public/emoji/lottie/{key}.json (skip > 120 KB,
 *      AC-4.12).
 *   4. Rewrite src/lib/emoji/lottieKeys.generated.json (sorted, trailing
 *      newline).
 *
 * Idempotent: existing files are skipped unless --force. Maintainer-only
 * script - `npm run build` never touches the network (BR-07).
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notoCodepointToKey, toEmojiKey } from './lib/emojiKey.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOCAB_DIR = path.join(ROOT, 'src/data/vocabulary');
const SVG_DIR = path.join(ROOT, 'public/emoji/svg');
const LOTTIE_DIR = path.join(ROOT, 'public/emoji/lottie');
const KEYS_FILE = path.join(ROOT, 'src/lib/emoji/lottieKeys.generated.json');
const ATTRIBUTION = path.join(ROOT, 'public/attribution.json');

const TWEMOJI_PIN = '15.1.0';
const TWEMOJI_URL = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_PIN}/assets/svg`;
const NOTO_INDEX_URL = 'https://googlefonts.github.io/noto-emoji-animation/data/api.json';
const NOTO_LOTTIE_URL = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
const MASCOT_EMOJI = ['🐷', '✨', '🎉'];
// CR-09: decorative icon literals used by the new header chips
// (RoundTimer / LiveScore) - enumerated here so the fetch pipeline keeps
// them vendored like every other emoji literal in the app.
const UI_CHROME_EMOJI = ['⏱️', '⭐'];
const LOTTIE_MAX_BYTES = 120 * 1024;
const CONCURRENCY = 8;

const force = process.argv.includes('--force');

async function collectEmoji() {
  const set = new Set([...MASCOT_EMOJI, ...UI_CHROME_EMOJI]);
  for (const file of await readdir(VOCAB_DIR)) {
    if (!file.endsWith('.ts')) continue;
    const source = await readFile(path.join(VOCAB_DIR, file), 'utf8');
    for (const match of source.matchAll(/emoji:\s*['"]([^'"]+)['"]/g)) {
      set.add(match[1]);
    }
  }
  return set;
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'student-self-practice-assets/1.0' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function withConcurrency(items, limit, worker) {
  const queue = [...items];
  const results = [];
  async function next() {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function main() {
  const emojiSet = await collectEmoji();
  const keys = [...new Set([...emojiSet].map(toEmojiKey))].sort();
  console.log(`vocab emoji: ${emojiSet.size} distinct, ${keys.length} keys`);

  await mkdir(SVG_DIR, { recursive: true });
  await mkdir(LOTTIE_DIR, { recursive: true });

  // ---- Twemoji SVG ----
  let svgOk = 0;
  const svgFailed = [];
  await withConcurrency(keys, CONCURRENCY, async (key) => {
    const target = path.join(SVG_DIR, `${key}.svg`);
    if (!force && existsSync(target)) {
      svgOk++;
      return;
    }
    try {
      await writeFile(target, await fetchBuffer(`${TWEMOJI_URL}/${key}.svg`));
      svgOk++;
    } catch (err) {
      svgFailed.push(`${key} (${err.message})`);
    }
  });
  console.log(`svg: ${svgOk}/${keys.length} ready`);
  if (svgFailed.length) console.log(`svg MISSING: ${svgFailed.join(', ')}`);

  // ---- Noto Animated Emoji lottie ----
  const index = await (await fetch(NOTO_INDEX_URL)).json();
  const notoByKey = new Map(index.icons.map((i) => [notoCodepointToKey(i.codepoint), i.codepoint]));
  const wanted = keys.filter((k) => notoByKey.has(k));
  const missingAnimation = keys.filter((k) => !notoByKey.has(k));
  console.log(`noto lottie available for ${wanted.length}/${keys.length} keys`);

  const downloaded = new Set();
  const skippedSize = [];
  await withConcurrency(wanted, CONCURRENCY, async (key) => {
    const target = path.join(LOTTIE_DIR, `${key}.json`);
    if (!force && existsSync(target)) {
      downloaded.add(key);
      return;
    }
    try {
      const buf = await fetchBuffer(`${NOTO_LOTTIE_URL}/${notoByKey.get(key)}/lottie.json`);
      if (buf.byteLength > LOTTIE_MAX_BYTES) {
        skippedSize.push(`${key} (${(buf.byteLength / 1024).toFixed(0)} KB)`);
        return;
      }
      await writeFile(target, buf);
      downloaded.add(key);
    } catch (err) {
      console.log(`lottie fetch failed ${key}: ${err.message}`);
    }
  });
  if (skippedSize.length) console.log(`lottie >120KB skipped: ${skippedSize.join(', ')}`);
  console.log(`emoji without Noto animation: ${missingAnimation.join(', ') || 'none'}`);

  // Manifest must match disk exactly (check-attribution C3): drop files
  // whose key left the bank, and only list keys with a file on disk.
  for (const file of await readdir(LOTTIE_DIR)) {
    const key = file.replace(/\.json$/, '');
    if (!keys.includes(key)) {
      await rm(path.join(LOTTIE_DIR, file));
    }
  }
  const onDisk = new Set((await readdir(LOTTIE_DIR)).map((f) => f.replace(/\.json$/, '')));
  const keyList = keys.filter((k) => onDisk.has(k)).sort();
  await writeFile(KEYS_FILE, `${JSON.stringify(keyList, null, 2)}\n`);
  console.log(`lottieKeys.generated.json: ${keyList.length} keys`);

  // ---- attribution.json collections (preserve images[] untouched) ----
  // Collection record shape per PRD 9.2: paths are directory prefixes.
  const svgFiles = (await readdir(SVG_DIR)).filter((f) => f.endsWith('.svg')).sort();
  const attribution = existsSync(ATTRIBUTION)
    ? JSON.parse(await readFile(ATTRIBUTION, 'utf8'))
    : { version: 1, images: [], collections: [] };
  attribution.version = 1;
  // Rewrite only the collections this script manages; entries maintained
  // elsewhere (e.g. CR-09's baloo-2 font collection) are preserved.
  const MANAGED_COLLECTION_IDS = new Set(['twemoji', 'noto-animated-emoji']);
  const foreignCollections = (attribution.collections ?? []).filter(
    (c) => !MANAGED_COLLECTION_IDS.has(c.id),
  );
  attribution.collections = [
    {
      id: 'twemoji',
      title: 'Twemoji',
      author: 'Twitter, Inc and other contributors',
      license: 'CC-BY-4.0',
      licenseLabel: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://github.com/jdecked/twemoji',
      version: TWEMOJI_PIN,
      paths: ['/emoji/svg/'],
      modified: false,
    },
    {
      id: 'noto-animated-emoji',
      title: 'Noto Emoji Animation',
      author: 'Google',
      license: 'CC-BY-4.0',
      licenseLabel: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://googlefonts.github.io/noto-emoji-animation/',
      version: new Date().toISOString().slice(0, 10),
      paths: ['/emoji/lottie/'],
      modified: false,
    },
    ...foreignCollections,
  ];
  attribution.images = attribution.images ?? [];
  await writeFile(ATTRIBUTION, `${JSON.stringify(attribution, null, 2)}\n`);
  console.log(`attribution.json: ${svgFiles.length} svg files, ${keyList.length} lottie (collections record prefixes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
