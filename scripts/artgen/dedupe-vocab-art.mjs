/**
 * CR-145 (art audit F-08): ~1,146 files in public/images/vocab/ are
 * byte-identical copies of their concepts/concept-<id>-<hash>.webp twins
 * - ~31MB shipped twice. This script removes each duplicate vocab file
 * and repoints its approved attribution record at the concepts twin
 * (same bytes, so the review verdict still holds).
 *
 *   node scripts/artgen/dedupe-vocab-art.mjs          dry-run report
 *   node scripts/artgen/dedupe-vocab-art.mjs --apply  delete + repoint
 *
 * Afterwards re-run build-vocab-images.mjs to regenerate VOCAB_IMAGES.
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');
const VOCAB_DIR = join(PUBLIC, 'images', 'vocab');
const CONCEPTS_DIR = join(PUBLIC, 'images', 'concepts');
const ATTR = join(PUBLIC, 'attribution.json');
const apply = process.argv.includes('--apply');

const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

const conceptsById = new Map();
for (const f of readdirSync(CONCEPTS_DIR)) {
  const m = f.match(/^concept-(.+)-[0-9a-f]{6}\.webp$/);
  if (m) conceptsById.set(m[1], f);
}

const attribution = JSON.parse(readFileSync(ATTR, 'utf8'));
const recordsByWord = new Map((attribution.images ?? []).map((r) => [r.wordId, r]));

const repointed = [];
const keptDiff = [];
const keptNoTwin = [];
const orphan = [];

for (const f of readdirSync(VOCAB_DIR).sort()) {
  if (!f.endsWith('.webp')) continue;
  const wordId = f.slice(0, -5);
  const twin = conceptsById.get(wordId);
  if (!twin) {
    keptNoTwin.push(wordId);
    continue;
  }
  const vocabPath = join(VOCAB_DIR, f);
  const conceptPath = join(CONCEPTS_DIR, twin);
  if (md5(vocabPath) !== md5(conceptPath)) {
    keptDiff.push(wordId);
    continue;
  }
  const record = recordsByWord.get(wordId);
  if (!record) {
    orphan.push(wordId);
    continue;
  }
  repointed.push({ wordId, twin });
  if (apply) {
    record.file = `/images/concepts/${twin}`;
    unlinkSync(vocabPath);
  }
}

console.log(`repoint ${repointed.length} | keep (diff) ${keptDiff.length} | keep (no twin) ${keptNoTwin.length} | orphan ${orphan.length}`);
if (keptDiff.length) console.log(`  diff kept: ${keptDiff.join(', ')}`);
if (orphan.length) console.log(`  ORPHAN (no attribution record - not deleted): ${orphan.join(', ')}`);

if (apply) {
  writeFileSync(ATTR, `${JSON.stringify(attribution, null, 2)}\n`);
  console.log(`updated ${ATTR}; deleted ${repointed.length} duplicate vocab files`);
} else {
  console.log('dry-run - pass --apply to delete + repoint');
}
