#!/usr/bin/env node
/**
 * One-shot producer of src/lib/generators/listeningSentenceFillBlank.baseline.json
 * (architecture ADR-10 / PRD AC-11.5, AC-11.6).
 *
 * Materializes the vocabulary bank + the listening-sentence generator at the
 * baseline commit into .baseline-tmp/, bundles them with esbuild, runs the
 * OLD generator over the OLD word bank, and writes a JSON map
 * `{ wordId: [{ id, sentence, displaySentence }, ...] }` sorted by wordId.
 *
 * Kept in-repo for reproducibility; safe to re-run (idempotent output).
 * Usage: node scripts/dump-sentence-baseline.mjs [baselineCommit]
 */
import { execSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_COMMIT = process.argv[2] ?? 'ebd58a5';
const TMP_DIR = path.join(REPO_ROOT, '.baseline-tmp');
const OUT_FILE = path.join(REPO_ROOT, 'src/lib/generators/listeningSentenceFillBlank.baseline.json');

function gitFiles(prefixes) {
  const out = [];
  for (const prefix of prefixes) {
    const names = execSync(`git ls-tree -r ${BASELINE_COMMIT} --name-only ${prefix}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((n) => n.trim() !== '' && !n.endsWith('.test.ts'));
    out.push(...names);
  }
  return out;
}

function materialize(files) {
  rmSync(TMP_DIR, { recursive: true, force: true });
  for (const file of files) {
    const content = execSync(`git show ${BASELINE_COMMIT}:${file}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const dest = path.join(TMP_DIR, file);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
}

async function main() {
  const files = gitFiles([
    'src/data/vocabulary/',
    'src/types/',
    'src/lib/generators/listeningSentenceFillBlank.ts',
  ]);
  materialize(files);
  console.log(`Materialized ${files.length} files at ${BASELINE_COMMIT} into .baseline-tmp/`);

  // Entry point: run the baseline generator over the baseline word bank.
  // The baseline generator predates `wordId`, so questions carry `word` text;
  // we map word text -> id via ALL_WORDS itself (word texts are unique, which
  // the existing image-choice generator already relies on).
  const entry = path.join(TMP_DIR, 'entry.ts');
  writeFileSync(
    entry,
    [
      `import { ALL_WORDS } from './src/data/vocabulary/index';`,
      `import { generateListeningSentenceFillBlankQuestions } from './src/lib/generators/listeningSentenceFillBlank';`,
      `const idByWord = new Map(ALL_WORDS.map((w) => [w.word, w.id]));`,
      `const questions = generateListeningSentenceFillBlankQuestions(ALL_WORDS);`,
      `const byWordId = {};`,
      `for (const q of questions) {`,
      `  const wordId = q.wordId ?? idByWord.get(q.word) ?? q.word;`,
      `  (byWordId[wordId] = byWordId[wordId] ?? []).push({`,
      `    id: q.id,`,
      `    sentence: q.sentence,`,
      `    displaySentence: q.displaySentence,`,
      `  });`,
      `}`,
      `export const baseline = byWordId;`,
      `export const wordIds = ALL_WORDS.map((w) => w.id).sort();`,
    ].join('\n'),
  );

  const bundleDir = mkdtempSync(path.join(tmpdir(), 'baseline-'));
  const bundleFile = path.join(bundleDir, 'bundle.mjs');
  buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundleFile,
    logLevel: 'silent',
  });

  try {
    const mod = await import(pathToFileURL(bundleFile).href);
    const out = {};
    for (const key of Object.keys(mod.baseline).sort()) {
      out[key] = mod.baseline[key];
    }
    writeFileSync(
      OUT_FILE,
      `${JSON.stringify({ wordIds: mod.wordIds, questions: out }, null, 2)}\n`,
      'utf8',
    );
    console.log(
      `Wrote ${OUT_FILE}: ${Object.keys(out).length} wordIds, ` +
        `${Object.values(out).reduce((n, arr) => n + arr.length, 0)} questions`,
    );
  } finally {
    rmSync(TMP_DIR, { recursive: true, force: true });
    rmSync(bundleDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
