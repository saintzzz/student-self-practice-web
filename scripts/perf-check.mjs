#!/usr/bin/env node
/**
 * perf-check - repeatable performance gate (docs/qa/performance-audit.md).
 *
 * Runs `vite build`, then reports every emitted asset's size + gzip size
 * and flags:
 *   - main entry chunk over WARN_KB (Vite's own warning line too)
 *   - total initial JS over BUDGET_KB gzip
 *
 * Interaction latency (RPC timing, first-question render) is measured
 * via Playwright per the recipe in the audit doc - this script covers
 * the static/bundle side that fits CI.
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const WARN_KB = 500;
const BUDGET_KB = 220; // gzip, initial JS entry (main chunk only)

console.log('building...');
execSync('npx vite build', { stdio: 'pipe' });

const dir = 'dist/assets';
const files = readdirSync(dir)
  .map((f) => {
    const p = join(dir, f);
    const raw = statSync(p).size;
    const gz = gzipSync(readFileSync(p)).length;
    return { f, raw, gz };
  })
  .sort((a, b) => b.raw - a.raw);

let fail = 0;
console.log('\nasset                            raw      gzip');
for (const { f, raw, gz } of files) {
  const kb = (n) => `${(n / 1024).toFixed(0).padStart(6)} kB`;
  const isEntry = /^index-.*\.js$/.test(f) && raw === Math.max(...files.filter((x) => /^index-.*\.js$/.test(x.f)).map((x) => x.raw));
  const warn = raw / 1024 > WARN_KB ? '  <- over 500kB' : '';
  const budget = isEntry && gz / 1024 > BUDGET_KB ? '  <- OVER BUDGET' : '';
  if (budget) fail = 1;
  console.log(`${f.padEnd(34)}${kb(raw)}  ${kb(gz)}${warn}${budget}`);
}

const entry = files
  .filter((x) => /^index-.*\.js$/.test(x.f))
  .sort((a, b) => b.raw - a.raw)[0];
if (entry) {
  console.log(`\nentry chunk: ${entry.f}  gzip ${(entry.gz / 1024).toFixed(0)} kB / budget ${BUDGET_KB} kB`);
}
process.exit(fail);
