#!/usr/bin/env node
/**
 * check-mascot-assets - CR-82 FF-11 mascot asset contract gate
 * (ARCHITECTURE-v5 s9.3, spec s9.5). Run via `code:reliability`.
 *
 *   - exactly the six be-heo-<pose>.json files for poses whose
 *     src/lib/mascot/assets.ts source is not 'missing';
 *   - <= 40 kB gzip each (level 9);
 *   - w = h = 512, fr = 30, ip = 0;
 *   - no text layers (ty:5), no image assets (assets[].p), no expressions
 *     (string-valued `x` props);
 *   - every fill/stroke color resolves inside MASCOT_PALETTE (theme.ts);
 *   - a provenance row in public/attribution.json covers /mascot/.
 *
 * Exit non-zero listing every violation.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASCOT_DIR = path.join(ROOT, 'public', 'mascot');
const ASSETS_TS = path.join(ROOT, 'src', 'lib', 'mascot', 'assets.ts');
const THEME_TS = path.join(ROOT, 'src', 'lib', 'ui', 'theme.ts');
const ATTRIBUTION = path.join(ROOT, 'public', 'attribution.json');
const GZIP_BUDGET = 40 * 1024;

const violations = [];
const check = (ok, message) => {
  if (!ok) violations.push(message);
};

/* Parse `MASCOT_ASSET_SOURCE` entries (pose: 'generated'|'commissioned'|'missing'). */
async function assetSources() {
  const src = await readFile(ASSETS_TS, 'utf8');
  const block = src.match(/MASCOT_ASSET_SOURCE[^=]*=\s*\{([\s\S]*?)\}/);
  check(!!block, 'assets.ts: MASCOT_ASSET_SOURCE not found');
  const map = new Map();
  for (const m of (block?.[1] ?? '').matchAll(/(\w+):\s*'(generated|commissioned|missing)'/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

/* Palette hexes allowed in generated assets. */
async function paletteHexes() {
  const src = await readFile(THEME_TS, 'utf8');
  const block = src.match(/MASCOT_PALETTE[^=]*=\s*\{([\s\S]*?)\}/);
  check(!!block, 'theme.ts: MASCOT_PALETTE not found');
  return new Set(
    [...(block?.[1] ?? '').matchAll(/'#[0-9A-Fa-f]{6}'/g)].map((m) => m[0].slice(1, -1).toLowerCase()),
  );
}

/* Walk a Lottie JSON, collecting {fl,st} colors + flagging banned nodes. */
function auditLayers(node, file, palette) {
  if (Array.isArray(node)) {
    for (const item of node) auditLayers(item, file, palette);
    return;
  }
  if (!node || typeof node !== 'object') return;
  check(node.ty !== 5, `${file}: text layer not allowed`);
  if ((node.ty === 'fl' || node.ty === 'st') && node.c?.k) {
    const [r, g, b] = node.c.k;
    const hex = `#${[r, g, b]
      .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
      .join('')}`;
    check(palette.has(hex), `${file}: color ${hex} outside MASCOT_PALETTE`);
  }
  check(typeof node.x !== 'string', `${file}: expression not allowed on "${node.nm ?? 'prop'}"`);
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') auditLayers(value, file, palette);
  }
}

async function main() {
  const sources = await assetSources();
  const palette = await paletteHexes();
  const expected = [...sources.entries()].filter(([, s]) => s !== 'missing').map(([p]) => `be-heo-${p}.json`);

  const files = existsSync(MASCOT_DIR) ? (await readdir(MASCOT_DIR)).filter((f) => f.endsWith('.json')) : [];
  for (const f of expected) {
    check(files.includes(f), `missing pose asset: public/mascot/${f}`);
  }
  for (const f of files) {
    check(expected.includes(f), `untracked pose asset on disk: public/mascot/${f}`);
  }

  for (const f of files) {
    const raw = await readFile(path.join(MASCOT_DIR, f));
    const gz = gzipSync(raw, 9).byteLength;
    check(gz <= GZIP_BUDGET, `${f}: ${(gz / 1024).toFixed(1)}kB gz exceeds the 40kB budget`);
    let json;
    try {
      json = JSON.parse(raw.toString('utf8'));
    } catch {
      check(false, `${f}: invalid JSON`);
      continue;
    }
    check(json.w === 512 && json.h === 512, `${f}: artboard must be 512x512 (w=${json.w} h=${json.h})`);
    check(json.fr === 30, `${f}: frame rate must be 30 (fr=${json.fr})`);
    check(json.ip === 0, `${f}: ip must be 0`);
    check(typeof json.op === 'number' && json.op > 0, `${f}: op must be the pose duration in frames`);
    for (const asset of json.assets ?? []) {
      check(!asset.p, `${f}: image assets are not allowed`);
    }
    auditLayers(json.layers ?? [], f, palette);
  }

  const attribution = JSON.parse(await readFile(ATTRIBUTION, 'utf8'));
  const covered = (attribution.collections ?? []).some((c) =>
    (c.paths ?? []).some((p) => 'mascot/'.startsWith(p.replace(/^\//, ''))),
  );
  check(covered, 'attribution.json: no collection covers /mascot/');

  if (violations.length) {
    console.error(`check-mascot-assets: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`check-mascot-assets OK: ${files.length} pose assets`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
