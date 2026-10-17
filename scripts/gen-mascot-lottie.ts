/**
 * CR-82 (ARCHITECTURE D-08, spec s9.5): generate Bé Heo's six pose assets
 * from the shared `poses.ts` geometry so frame 0 of every JSON equals the
 * static SVG pose by construction.
 *
 * Run: `npm run assets:mascot` (vite-node). Output:
 * `public/mascot/be-heo-<pose>.json` - plain bodymovin Lottie, 512x512,
 * 30fps. The script FAILS if a pose lands above the s9.5 budget
 * (<=40KB gzipped) or violates the art rules (palette-only colors, no
 * text/raster layers).
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLottieJson } from '../src/lib/mascot/lottieFromPoses';
import { MASCOT_POSES, type MascotPoseName } from '../src/lib/mascot/poses';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(REPO_ROOT, 'public', 'mascot');
const GZIP_BUDGET = 40 * 1024;

const POSES = Object.keys(MASCOT_POSES) as MascotPoseName[];

mkdirSync(OUT_DIR, { recursive: true });

let failures = 0;
for (const pose of POSES) {
  const json = buildLottieJson(pose);

  /* Art-rule assertions (spec s9.5). */
  const text = JSON.stringify(json);
  if (json.w !== 512 || json.h !== 512 || json.fr !== 30) {
    console.error(`be-heo-${pose}: wrong artboard/fps (w=${json.w} h=${json.h} fr=${json.fr})`);
    failures += 1;
  }
  if ((json.assets as unknown[]).length > 0) {
    console.error(`be-heo-${pose}: raster/linked assets are not allowed`);
    failures += 1;
  }
  if (/"ty":5/.test(text) || /"t":\s*\{/.test(text)) {
    console.error(`be-heo-${pose}: text layers are not allowed`);
    failures += 1;
  }
  /* Lottie expressions are string-valued `x` props; easing keyframes use
     numeric-array `x` props and are fine. */
  if (/"x"\s*:\s*"/.test(text)) {
    console.error(`be-heo-${pose}: expressions are not allowed`);
    failures += 1;
  }

  const out = resolve(OUT_DIR, `be-heo-${pose}.json`);
  writeFileSync(out, `${text}\n`);
  const gz = gzipSync(Buffer.from(text)).byteLength;
  const raw = Buffer.byteLength(text);
  console.log(
    `be-heo-${pose}.json  raw=${(raw / 1024).toFixed(1)}KB  gz=${(gz / 1024).toFixed(1)}KB  frames=${json.op}`,
  );
  if (gz > GZIP_BUDGET) {
    console.error(`be-heo-${pose}: exceeds the 40KB gzip budget`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`gen-mascot-lottie: ${failures} budget/rule violation(s)`);
  process.exit(1);
}
console.log('gen-mascot-lottie: all 6 poses generated within budget.');
