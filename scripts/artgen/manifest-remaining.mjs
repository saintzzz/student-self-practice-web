// Remaining-queue manifest: manifest2 entries whose landed webp is still
// the old emoji/symbol render (mtime before the Oct-19 bespoke regen
// waves). Regenerating replaces the same `out` path, so bank rows stay
// valid. Run: node scripts/artgen/run.mjs --gen --manifest=manifest-remaining.mjs
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './manifest2.mjs';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'images');
const CUTOFF = new Date('2026-10-19').getTime();

export const ASSETS_LIST = ASSETS.filter((a) => {
  const p = join(PUB, a.out);
  return !existsSync(p) || statSync(p).mtimeMs < CUTOFF;
});

export { ASSETS_LIST as ASSETS };
