#!/usr/bin/env node
/**
 * check-mascot-assets - mascot art contract gate (bespoke-art era).
 * Run via `code:reliability`.
 *
 *   - for every pose not 'missing' in src/lib/mascot/assets.ts, the
 *     MOOD_FILE webp exists under public/images/mascot/, plus
 *     be-heo-face.webp (the inline/avatar face art);
 *   - each file is a valid RIFF/WebP image, 512x512, <= 80 kB;
 *   - a provenance row in public/attribution.json covers /images/mascot/.
 *
 * Exit non-zero listing every violation.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASCOT_DIR = path.join(ROOT, 'public', 'images', 'mascot');
const ASSETS_TS = path.join(ROOT, 'src', 'lib', 'mascot', 'assets.ts');
const ATTRIBUTION = path.join(ROOT, 'public', 'attribution.json');
const SIZE_BUDGET = 80 * 1024;

const violations = [];
const check = (ok, message) => {
  if (!ok) violations.push(message);
};

/* Parse MASCOT_ASSET_SOURCE + MOOD_FILE entries from assets.ts. */
async function expectedFiles() {
  const src = await readFile(ASSETS_TS, 'utf8');
  const sources = src.match(/MASCOT_ASSET_SOURCE[^=]*=\s*\{([\s\S]*?)\}/);
  check(!!sources, 'assets.ts: MASCOT_ASSET_SOURCE not found');
  const moodFile = src.match(/MOOD_FILE[^=]*=\s*\{([\s\S]*?)\}/);
  check(!!moodFile, 'assets.ts: MOOD_FILE not found');

  const live = new Set(
    [...(sources?.[1] ?? '').matchAll(/(\w+):\s*'(generated|commissioned)'/g)].map((m) => m[1]),
  );
  const files = new Set(['be-heo-face']);
  for (const m of (moodFile?.[1] ?? '').matchAll(/(\w+):\s*'(be-heo-[\w-]+)'/g)) {
    if (live.has(m[1])) files.add(m[2]);
  }
  return [...files];
}

/* Read image dimensions from a WebP buffer (VP8, VP8L and VP8X). */
function webpDims(buf) {
  if (buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') {
    return null;
  }
  const fourCC = buf.toString('latin1', 12, 16);
  if (fourCC === 'VP8X') {
    return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  }
  if (fourCC === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourCC === 'VP8L') {
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    return {
      w: 1 + (((b1 & 0x3f) << 8) | b0),
      h: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  return null;
}

async function main() {
  const expected = expectedFiles();
  for (const stem of await expected) {
    const file = path.join(MASCOT_DIR, `${stem}.webp`);
    check(existsSync(file), `missing pose art: public/images/mascot/${stem}.webp`);
    if (!existsSync(file)) continue;
    const buf = await readFile(file);
    check(buf.byteLength <= SIZE_BUDGET, `${stem}.webp: ${(buf.byteLength / 1024).toFixed(1)}kB exceeds the 80kB budget`);
    const dims = webpDims(buf);
    check(!!dims, `${stem}.webp: not a valid WebP image`);
    if (dims) check(dims.w === 512 && dims.h === 512, `${stem}.webp: must be 512x512 (got ${dims.w}x${dims.h})`);
  }

  const attribution = JSON.parse(await readFile(ATTRIBUTION, 'utf8'));
  const covered = (attribution.collections ?? []).some((c) =>
    (c.paths ?? []).some((p) => 'images/mascot/'.startsWith(p.replace(/^\//, ''))),
  );
  check(covered, 'attribution.json: no collection covers /images/mascot/');

  if (violations.length) {
    console.error(`check-mascot-assets: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`check-mascot-assets OK: ${(await expected).length} art files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
