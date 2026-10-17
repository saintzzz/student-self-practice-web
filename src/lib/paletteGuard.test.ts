import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CR-82 (FF-7 / FF-8): palette purge guards.
 * - indigo is banned everywhere in src/ (OM-6 / R-v5-04);
 * - violet survives only in the closed inventory: the space land entries
 *   in theme.ts (nightRim violet-400, discBg violet-500, cardTint
 *   violet-50/95, accentText violet-800) - the L1 nebula is a hex
 *   (#a78bfa) under scenePalette, not a violet-* class.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const VIOLET_ALLOWLIST = new Set([
  'bg-violet-400',
  'bg-violet-500',
  'bg-violet-50/95',
  'text-violet-800',
]);

function collectSource(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSource(full, out);
    } else if (/\.(ts|tsx|js|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('palette guards (CR-82 FF-7/FF-8)', () => {
  it('no indigo-* class anywhere in src/', () => {
    const offenders: string[] = [];
    for (const file of collectSource(SRC_DIR)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/\bindigo-\d/.test(line)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('violet-* only in the closed inventory', () => {
    const offenders: string[] = [];
    for (const file of collectSource(SRC_DIR)) {
      const isTheme = file.endsWith(path.join('lib', 'ui', 'theme.ts'));
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/[\w:/-]*violet-\d[^'"`\s]*/g)) {
          if (!isTheme || !VIOLET_ALLOWLIST.has(m[0])) {
            offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1} (${m[0]})`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
