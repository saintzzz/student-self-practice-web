#!/usr/bin/env node
/**
 * check-attribution - C3 bidirectional inventory gate (AC-4.9, AC-7.11)
 * plus the CR-53 legal gate.
 *
 *   - every file in public/emoji/svg/ appears in the 'twemoji' collection
 *     paths, and vice versa;
 *   - every public/emoji/lottie/{k}.json has key k in
 *     src/lib/emoji/lottieKeys.generated.json, and vice versa;
 *   - every public/images/vocab/{id}.webp has exactly one attribution
 *     images[] record that is approved (reviewStatus, reviewedBy,
 *     reviewedAt all set), licensed cc0|by, and id exists in ALL_WORDS;
 *   - every images[] record's file exists;
 *   - every declared collection path exists on disk;
 *   - every asset subdirectory under public/{images,emoji,fonts,sfx} is
 *     covered by a declared collection path;
 *   - every public/fonts/<dir>/ ships its license file (OFL condition);
 *   - no forbidden prefixes (public/images/vio/ - harvested third-party
 *     assets removed in CR-53, no redistribution rights);
 *   - no assets under src/assets/ (A-07).
 *
 * Exit non-zero listing every violation.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ATTRIBUTION = path.join(PUBLIC_DIR, 'attribution.json');
const KEYS_FILE = path.join(ROOT, 'src/lib/emoji/lottieKeys.generated.json');
const VOCAB_DIR = path.join(ROOT, 'src/data/vocabulary');
const SRC_ASSETS = path.join(ROOT, 'src/assets');
const ALLOWED_IMAGE_LICENSES = new Set(['cc0', 'by']);
const REQUIRED_IMAGE_FIELDS = [
  'wordId',
  'word',
  'file',
  'title',
  'creator',
  'creatorUrl',
  'license',
  'licenseVersion',
  'licenseUrl',
  'sourceUrl',
  'provider',
  'openverseId',
  'modified',
  'reviewStatus',
  'reviewedBy',
  'reviewedAt',
];
const REQUIRED_COLLECTION_FIELDS = [
  'id',
  'title',
  'author',
  'license',
  'licenseLabel',
  'licenseUrl',
  'sourceUrl',
  'version',
  'paths',
  'modified',
];

const violations = [];
const check = (ok, message) => {
  if (!ok) violations.push(message);
};

async function ls(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).sort();
}

async function lsDirs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function collectWordIds() {
  const ids = new Set();
  for (const file of await ls(VOCAB_DIR)) {
    if (!file.endsWith('.ts')) continue;
    const source = await readFile(path.join(VOCAB_DIR, file), 'utf8');
    for (const match of source.matchAll(/\bid:\s*'([^']+)'/g)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

async function main() {
  check(existsSync(ATTRIBUTION), 'public/attribution.json missing');
  const attribution = existsSync(ATTRIBUTION)
    ? JSON.parse(await readFile(ATTRIBUTION, 'utf8'))
    : { collections: [], images: [] };
  const collections = attribution.collections ?? [];
  const images = attribution.images ?? [];

  check(attribution.version === 1, 'attribution.json: version must be 1');

  // collections: required fields; every declared path must exist on disk.
  const svgFiles = await ls(path.join(PUBLIC_DIR, 'emoji/svg'));
  const declaredPrefixes = [];
  for (const c of collections) {
    for (const field of REQUIRED_COLLECTION_FIELDS) {
      check(field in c, `collection "${c.id}": missing field "${field}"`);
    }
    check(Array.isArray(c.paths), `collection "${c.id}": paths must be an array`);
    for (const p of c.paths ?? []) {
      const rel = p.replace(/^\//, '');
      declaredPrefixes.push(rel);
      check(
        existsSync(path.join(PUBLIC_DIR, rel)),
        `collection "${c.id}": declared path does not exist: ${p}`,
      );
    }
  }

  // CR-53 legal gate: prefixes that must never ship (rights unclear).
  const FORBIDDEN_PREFIXES = ['images/vio/'];
  for (const prefix of FORBIDDEN_PREFIXES) {
    check(
      !existsSync(path.join(PUBLIC_DIR, prefix)),
      `forbidden asset directory exists: public/${prefix}`,
    );
    check(
      !declaredPrefixes.some((d) => d.startsWith(prefix) || prefix.startsWith(d)),
      `forbidden path declared in attribution.json: ${prefix}`,
    );
  }

  // Every asset subdirectory in public/ must be covered by a declared
  // collection path (reverse direction: nothing ships unattributed).
  for (const topLevel of ['images', 'emoji', 'fonts']) {
    for (const dir of await lsDirs(path.join(PUBLIC_DIR, topLevel))) {
      const rel = `${topLevel}/${dir}/`;
      check(
        declaredPrefixes.some((prefix) => rel.startsWith(prefix) || prefix.startsWith(rel)),
        `asset directory without attribution collection: public/${rel}`,
      );
    }
  }
  // Top-level dirs holding files directly (e.g. public/sfx/*.mp3) must
  // also be declared.
  for (const topLevel of ['sfx']) {
    if (!existsSync(path.join(PUBLIC_DIR, topLevel))) continue;
    check(
      declaredPrefixes.some((prefix) => `${topLevel}/`.startsWith(prefix) || prefix.startsWith(`${topLevel}/`)),
      `asset directory without attribution collection: public/${topLevel}/`,
    );
  }

  // OFL fonts must ship the license text inside their directory.
  for (const fontDir of await lsDirs(path.join(PUBLIC_DIR, 'fonts'))) {
    const dir = path.join(PUBLIC_DIR, 'fonts', fontDir);
    const hasLicense = (await ls(dir)).some((f) => /^(OFL|LICENSE|COPYING)/i.test(f));
    check(hasLicense, `font directory missing license file: public/fonts/${fontDir}/`);
  }
  const twemoji = collections.find((c) => c.id === 'twemoji');
  check(!!twemoji, 'attribution.json: no "twemoji" collection');
  const twemojiPrefixes = (twemoji?.paths ?? []).map((p) => p.replace(/^\//, ''));
  for (const f of svgFiles) {
    const rel = `emoji/svg/${f}`;
    check(
      twemojiPrefixes.some((prefix) => rel.startsWith(prefix)),
      `svg file not under any twemoji path prefix: ${f}`,
    );
  }
  for (const prefix of twemoji?.paths ?? []) {
    check(svgFiles.length > 0, `twemoji path "${prefix}" declared but public/emoji/svg is empty`);
  }

  // lottie dir <-> generated key set
  const lottieFiles = await ls(path.join(PUBLIC_DIR, 'emoji/lottie'));
  const lottieKeys = existsSync(KEYS_FILE) ? new Set(JSON.parse(await readFile(KEYS_FILE, 'utf8'))) : new Set();
  for (const f of lottieFiles) check(lottieKeys.has(f.replace(/\.json$/, '')), `lottie file without manifest key: ${f}`);
  for (const k of lottieKeys) check(lottieFiles.includes(`${k}.json`), `manifest key without file: ${k}`);

  // images: file <-> approved record, fields, license, vocab id
  const wordIds = await collectWordIds();
  const imageFiles = await ls(path.join(PUBLIC_DIR, 'images/vocab'));
  const recordsByWord = new Map();
  for (const r of images) recordsByWord.set(r.wordId, [...(recordsByWord.get(r.wordId) ?? []), r]);

  for (const f of imageFiles) {
    const wordId = f.replace(/\.webp$/, '');
    const records = recordsByWord.get(wordId) ?? [];
    check(records.length === 1, `image ${f}: expected exactly 1 attribution record, got ${records.length}`);
    const r = records[0];
    if (!r) continue;
    check(r.reviewStatus === 'approved', `image ${f}: reviewStatus=${r.reviewStatus}`);
    check(!!r.reviewedBy && !!r.reviewedAt, `image ${f}: missing reviewedBy/reviewedAt`);
    check(ALLOWED_IMAGE_LICENSES.has(r.license), `image ${f}: license=${r.license}`);
    check(r.license === 'cc0' || !!r.creator, `image ${f}: "by" license requires a creator`);
    check(wordIds.has(wordId), `image ${f}: wordId not in ALL_WORDS`);
  }
  for (const r of images) {
    check(imageFiles.includes(path.basename(r.file ?? '')), `attribution record without file: ${r.wordId} -> ${r.file}`);
    check(wordIds.has(r.wordId), `attribution record wordId not in ALL_WORDS: ${r.wordId}`);
    check(String(r.file).startsWith('/images/vocab/'), `attribution ${r.wordId}: file must be /images/vocab/...`);
    for (const field of REQUIRED_IMAGE_FIELDS) {
      check(field in r, `attribution ${r.wordId}: missing field "${field}"`);
    }
  }

  check(!existsSync(SRC_ASSETS), 'src/assets/ must not exist (A-07)');

  if (violations.length) {
    console.error(`check-attribution: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(
    `check-attribution OK: ${svgFiles.length} svg, ${lottieFiles.length} lottie, ${imageFiles.length} images`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
