#!/usr/bin/env node
/**
 * One-shot producer of src/data/vocabulary/bank.baseline.json (PRD AC-6.8).
 *
 * Materializes the vocabulary bank at the baseline commit into .baseline-tmp/,
 * bundles it with esbuild, and dumps every word's data fields keyed by id so
 * the unit suite can assert the 283 pre-existing words are untouched.
 *
 * Kept in-repo for reproducibility; safe to re-run (idempotent output).
 * Usage: node scripts/dump-word-baseline.mjs [baselineCommit]
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
const OUT_FILE = path.join(REPO_ROOT, 'src/data/vocabulary/bank.baseline.json');

function main() {
  const names = execSync(`git ls-tree -r ${BASELINE_COMMIT} --name-only src/data/vocabulary/`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((n) => n.trim() !== '' && !n.endsWith('.test.ts'));

  rmSync(TMP_DIR, { recursive: true, force: true });
  for (const file of names) {
    const content = execSync(`git show ${BASELINE_COMMIT}:${file}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const dest = path.join(TMP_DIR, file);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  console.log(`Materialized ${names.length} files at ${BASELINE_COMMIT} into .baseline-tmp/`);

  const entry = path.join(TMP_DIR, 'entry.ts');
  writeFileSync(
    entry,
    [
      `import { ALL_WORDS } from './src/data/vocabulary/index';`,
      `const words = {};`,
      `for (const w of ALL_WORDS) {`,
      `  words[w.id] = {`,
      `    id: w.id,`,
      `    topicId: w.topicId,`,
      `    word: w.word,`,
      `    ...(w.plural === undefined ? {} : { plural: w.plural }),`,
      `    emoji: w.emoji,`,
      `    countable: w.countable,`,
      `    explanation: w.explanation,`,
      `  };`,
      `}`,
      `export { words };`,
    ].join('\n'),
  );

  const bundleDir = mkdtempSync(path.join(tmpdir(), 'word-baseline-'));
  const bundleFile = path.join(bundleDir, 'bundle.mjs');
  buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundleFile,
    logLevel: 'silent',
  });

  return import(pathToFileURL(bundleFile).href).then((mod) => {
    const out = {};
    for (const key of Object.keys(mod.words).sort()) {
      out[key] = mod.words[key];
    }
    writeFileSync(OUT_FILE, `${JSON.stringify({ words: out }, null, 2)}\n`, 'utf8');
    rmSync(TMP_DIR, { recursive: true, force: true });
    rmSync(bundleDir, { recursive: true, force: true });
    console.log(`Wrote ${Object.keys(out).length} baseline word records to ${path.relative(REPO_ROOT, OUT_FILE)}`);
  });
}

await main();
