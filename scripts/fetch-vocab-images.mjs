#!/usr/bin/env node
/**
 * assets:images - Openverse stage-1 fetch/normalize/staging (US-4,
 * AC-4.1..4.8). No API key needed; identifying User-Agent; >= 3 s between
 * requests; honors Retry-After / X-RateLimit-Remaining=0; hard cap
 * 20 req/min; resume by skipping wordIds already in candidates.json.
 *
 * Output: image-staging/{wordId}.webp (WebP <= 512 px, <= 80 KB) +
 * image-staging/candidates.json records with reviewStatus:'pending'.
 * Nothing lands in public/ until a human approves (publish script).
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOCAB_DIR = path.join(ROOT, 'src/data/vocabulary');
const STAGING = path.join(ROOT, 'image-staging');
const CANDIDATES = path.join(STAGING, 'candidates.json');
const COVERAGE_DOC = path.join(ROOT, 'docs/image-bank-coverage.md');

const USER_AGENT = 'student-self-practice-web/1.0 (contact: local dev)';
const MIN_DELAY_MS = 3000;
const MAX_BYTES = 80 * 1024;
const MAX_DIM = 512;

const onlyWord = process.argv.find((a) => a.startsWith('--word='))?.split('=')[1];

async function collectWords() {
  const words = [];
  for (const file of await readdir(VOCAB_DIR)) {
    if (!file.endsWith('.ts')) continue;
    const source = await readFile(path.join(VOCAB_DIR, file), 'utf8');
    for (const match of source.matchAll(
      /\{\s*id:\s*'([^']+)'[\s\S]*?word:\s*'([^']+)'[\s\S]*?emoji:\s*'([^']+)'[\s\S]*?\}/g,
    )) {
      words.push({ id: match[1], word: match[2], emoji: match[3] });
    }
  }
  return words;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;
let requestsThisMinute = [];
async function rateLimitedFetch(url) {
  const now = Date.now();
  requestsThisMinute = requestsThisMinute.filter((t) => now - t < 60_000);
  if (requestsThisMinute.length >= 20) {
    await sleep(60_000 - (now - requestsThisMinute[0]) + 100);
  }
  const wait = MIN_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  requestsThisMinute.push(lastRequestAt);

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.headers.get('x-ratelimit-remaining') === '0' || res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? 60);
    await sleep(Math.max(retryAfter, 60) * 1000);
    lastRequestAt = Date.now();
  }
  return res;
}

const DASH_CHARS = /[—–]/g;
const NON_PRINTABLE = /[^ -~ -￿]/g;
function sanitize(text) {
  return String(text ?? '').replace(DASH_CHARS, '-').replace(NON_PRINTABLE, '').trim();
}

async function normalizeToWebp(buffer) {
  for (const quality of [80, 70, 60, 50, 40]) {
    const out = await sharp(buffer)
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.byteLength <= MAX_BYTES) return out;
  }
  return null;
}

async function main() {
  await mkdir(STAGING, { recursive: true });
  const candidates = existsSync(CANDIDATES) ? JSON.parse(await readFile(CANDIDATES, 'utf8')) : [];
  const done = new Set(candidates.map((c) => c.wordId));

  const words = await collectWords();
  const todo = words.filter((w) => !done.has(w.id) && (!onlyWord || w.id === onlyWord));
  console.log(`words: ${words.length}, staged already: ${done.size}, to fetch: ${todo.length}`);

  const totals = { fetched: 0, 'rejected-license': 0, 'rejected-size': 0, 'no-result': 0 };
  for (const w of todo) {
    try {
      const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(w.word)}&license=cc0,by&page_size=20`;
      const res = await rateLimitedFetch(url);
      if (!res.ok) throw new Error(`search HTTP ${res.status}`);
      const { results = [] } = await res.json();

      let picked = null;
      let rejected = 0;
      for (const r of results) {
        const license = String(r.license ?? '').toLowerCase();
        const creator = sanitize(r.creator);
        if (!['cc0', 'by'].includes(license) || (license === 'by' && !creator)) {
          rejected++;
          continue;
        }
        picked = r;
        break;
      }
      totals['rejected-license'] += rejected;

      if (!picked) {
        totals['no-result']++;
        console.log(`  ${w.id}: no acceptable result (${rejected} rejected-license)`);
        continue;
      }

      const imgRes = await rateLimitedFetch(picked.url);
      if (!imgRes.ok) throw new Error(`image HTTP ${imgRes.status}`);
      const webp = await normalizeToWebp(Buffer.from(await imgRes.arrayBuffer()));
      if (!webp) {
        totals['rejected-size']++;
        console.log(`  ${w.id}: could not fit <=80KB`);
        continue;
      }

      await writeFile(path.join(STAGING, `${w.id}.webp`), webp);
      const license = String(picked.license).toLowerCase();
      const creator = sanitize(picked.creator);
      candidates.push({
        wordId: w.id,
        word: w.word,
        file: `/images/vocab/${w.id}.webp`,
        title: sanitize(picked.title) || w.word,
        creator: creator || 'unknown',
        creatorUrl: picked.creator_url ?? null,
        license,
        licenseVersion: String(picked.license_version ?? ''),
        licenseUrl: picked.license_url ?? '',
        sourceUrl: picked.foreign_landing_url ?? picked.url,
        provider: picked.provider ?? 'openverse',
        openverseId: picked.id ?? '',
        modified: true,
        reviewStatus: 'pending',
        reviewedBy: null,
        reviewedAt: null,
      });
      totals.fetched++;
      console.log(`  ${w.id}: staged ${(webp.byteLength / 1024).toFixed(0)} KB (${picked.license})`);
    } catch (err) {
      console.log(`  ${w.id}: ERROR ${err.message}`);
    }
  }

  await writeFile(CANDIDATES, `${JSON.stringify(candidates, null, 2)}\n`);

  const coverage = [
    '# Image bank coverage',
    '',
    `Generated by \`npm run assets:images\`. Words: ${words.length}.`,
    '',
    `- staged: ${candidates.length}`,
    `- approved: ${candidates.filter((c) => c.reviewStatus === 'approved').length}`,
    `- missing (no acceptable result): ${words.length - candidates.length}`,
    '',
    ...words.map((w) => {
      const c = candidates.find((x) => x.wordId === w.id);
      return `- ${c ? (c.reviewStatus === 'approved' ? '[approved]' : '[pending]') : '[missing]'} ${w.id} (${w.word})`;
    }),
    '',
  ];
  await writeFile(COVERAGE_DOC, coverage.join('\n'));
  console.log(`totals: ${JSON.stringify(totals)}; coverage -> docs/image-bank-coverage.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
