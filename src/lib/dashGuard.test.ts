import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * AC-7.9 / F-12: shipped copy must contain no typographic dashes.
 * Grade-2 readability rule - U+2013 (en dash) and U+2014 (em dash) are
 * banned in every file under src/ and e2e/, in index.html, and in
 * public/attribution.json (Credits copy is data-driven).
 * The codepoints are built via String.fromCodePoint so this guard file
 * itself stays inside the rule it enforces.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EN_DASH = String.fromCodePoint(0x2013);
const EM_DASH = String.fromCodePoint(0x2014);
const DASHES = new RegExp(`[${EN_DASH}${EM_DASH}]`);

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(ts|tsx|css|html|json|mjs|js|md)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const TARGETS = [
  ...collectFiles(path.join(REPO_ROOT, 'src')),
  ...collectFiles(path.join(REPO_ROOT, 'e2e')),
  path.join(REPO_ROOT, 'index.html'),
  path.join(REPO_ROOT, 'public', 'attribution.json'),
];

describe('dash guard (AC-7.9, F-12)', () => {
  it('no shipped file contains U+2013 or U+2014', () => {
    const offenders: string[] = [];
    for (const file of TARGETS) {
      const content = readFileSync(file, 'utf8');
      if (DASHES.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('sanity: the guard actually detects dashes', () => {
    expect(DASHES.test(`a${EN_DASH}b`)).toBe(true);
    expect(DASHES.test(`a${EM_DASH}b`)).toBe(true);
    expect(DASHES.test('a-b')).toBe(false);
  });
});
