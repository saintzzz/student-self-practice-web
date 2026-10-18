import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CR-82 (FF-9 / FF-18): dependency + Lottie isolation guards.
 * - package.json `dependencies` key set equals the CR-82 baseline (no
 *   new runtime dependency - motion stays CSS + the already-present
 *   dotlottie player);
 * - `@lottiefiles/*` may be imported only by EmojiLottiePlayer.tsx so
 *   the player runtime never leaks into the entry chunk or a second
 *   import site. (The mascot rig is gone - MascotArt is CSS + webp.)
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const DEPENDENCY_BASELINE = [
  '@lottiefiles/dotlottie-react',
  '@lottiefiles/dotlottie-web',
  '@supabase/supabase-js',
  'react',
  'react-dom',
];

const LOTTIE_IMPORTERS = new Set([
  path.join('src', 'components', 'EmojiLottiePlayer.tsx'),
]);

function collectSource(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSource(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('dependency guards (CR-82 FF-9/FF-18)', () => {
  it('package.json dependencies equal the recorded baseline', () => {
    const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    expect(Object.keys(pkg.dependencies).sort()).toEqual([...DEPENDENCY_BASELINE].sort());
  });

  it('@lottiefiles/* imported only by the two player wrappers', () => {
    const importers: string[] = [];
    for (const file of collectSource(SRC_DIR)) {
      const source = readFileSync(file, 'utf8');
      if (/from\s+['"]@lottiefiles\//.test(source) || /import\s*\(\s*['"]@lottiefiles\//.test(source)) {
        importers.push(path.relative(REPO_ROOT, file));
      }
    }
    for (const importer of importers) {
      expect(LOTTIE_IMPORTERS.has(importer), `unexpected lottie importer: ${importer}`).toBe(true);
    }
  });
});
