#!/usr/bin/env node
/**
 * assets:images:publish - copy APPROVED staged images into public/ and
 * append them to public/attribution.json (AC-4.11). This script never
 * sets reviewStatus itself (BR-12): a human edits candidates.json.
 * Prints the `imageUrl:` line to paste into the vocab file (ADR-5).
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = path.join(ROOT, 'image-staging');
const CANDIDATES = path.join(STAGING, 'candidates.json');
const PUBLISH_DIR = path.join(ROOT, 'public/images/vocab');
const ATTRIBUTION = path.join(ROOT, 'public/attribution.json');

async function main() {
  if (!existsSync(CANDIDATES)) {
    console.log('no image-staging/candidates.json - run `npm run assets:images` first');
    return;
  }
  const candidates = JSON.parse(await readFile(CANDIDATES, 'utf8'));
  const approved = candidates.filter(
    (c) => c.reviewStatus === 'approved' && c.reviewedBy && c.reviewedAt,
  );
  if (!approved.length) {
    console.log('no approved candidates (a human must set reviewStatus:"approved" + reviewedBy/reviewedAt)');
    return;
  }

  await mkdir(PUBLISH_DIR, { recursive: true });
  const attribution = existsSync(ATTRIBUTION)
    ? JSON.parse(await readFile(ATTRIBUTION, 'utf8'))
    : { images: [], collections: [] };
  attribution.images = attribution.images ?? [];
  const existing = new Set(attribution.images.map((r) => r.wordId));

  for (const c of approved) {
    const src = path.join(STAGING, `${c.wordId}.webp`);
    if (!existsSync(src)) {
      console.log(`  ${c.wordId}: approved but no staged file - skipped`);
      continue;
    }
    await copyFile(src, path.join(PUBLISH_DIR, `${c.wordId}.webp`));
    if (!existing.has(c.wordId)) {
      attribution.images.push(c);
      existing.add(c.wordId);
    }
    console.log(`  ${c.wordId}: published -> add to vocab entry:`);
    console.log(`      imageUrl: '/images/vocab/${c.wordId}.webp',`);
  }

  attribution.images.sort((a, b) => String(a.wordId).localeCompare(String(b.wordId)));
  await writeFile(ATTRIBUTION, `${JSON.stringify(attribution, null, 2)}\n`);
  console.log(`attribution.json images: ${attribution.images.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
