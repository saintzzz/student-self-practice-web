#!/usr/bin/env node
/**
 * Pollinations.ai image generation driver - third parallel provider for
 * the artgen queue (same manifest/output contract as run.mjs /
 * run-gemini.mjs). Free, keyless, no browser needed: a plain GET returns
 * a JPEG. artgen-out/{id}.png stays the done marker - whichever provider
 * lands the file first wins; others skip it.
 *
 *   node scripts/artgen/run-pollinations.mjs --gen --manifest=manifest-remaining.mjs --workers=3
 *
 * Notes:
 * - Response is JPEG even though the file is saved as .png - resize2.py
 *   opens by magic bytes, extension does not matter.
 * - pollinations.ai stamps a small "pollinations.ai" watermark bottom-right
 *   even with nologo=true on anonymous tier - assets have pure-white
 *   backgrounds by prompt contract, so a white cover patch is composited
 *   over that corner before save.
 * - Anonymous rate is ~1 req / few seconds per IP; workers self-throttle
 *   and 429/5xx responses retry with backoff, no quota to burn.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
if (!manifestArg) { console.error('need --manifest=<file>'); process.exit(1); }
const { ASSETS } = await import(`./${manifestArg.split('=')[1]}`);

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(prompt, seed) {
  const u =
    'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
    `?width=1024&height=1024&nologo=true&private=true&seed=${seed}&model=flux`;
  const res = await fetch(u, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) return { err: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  const magic = buf.length > 12 &&
    ((buf[0] === 0x89 && buf[1] === 0x50) ||
     (buf[0] === 0xff && buf[1] === 0xd8) ||
     (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'));
  if (!magic || buf.length < 30_000) return { err: 'bad-body' };
  return { buf };
}

/** Blur-out the bottom-right watermark - a hard white patch would show
 *  against the soft off-white/gradient background these prompts render. */
async function scrubWatermark(buf) {
  const im = sharp(buf);
  const { width, height } = await im.metadata();
  const w = Math.round(width * 0.3);
  const h = Math.round(height * 0.08);
  const blurred = await sharp(buf)
    .extract({ left: width - w, top: height - h, width: w, height: h })
    .blur(40)
    .toBuffer();
  return im.composite([{ input: blurred, left: width - w, top: height - h }]).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  const workersArg = args.find((a) => a.startsWith('--workers='));
  const WORKERS = Math.max(1, Math.min(4, Number(workersArg?.split('=')[1]) || 1));
  const todo = ASSETS.filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
  console.log(`[artgen-polli] ${todo.length} asset(s) on ${WORKERS} worker(s)`);
  if (!todo.length) return;

  // Same wrong-image guard as the gemini driver: identical bytes across
  // different ids = a recurring promo/error image, not real art.
  const seen = new Set();
  for (const f of readdirSync(OUT).filter((x) => x.endsWith('.png')))
    seen.add(createHash('md5').update(readFileSync(join(OUT, f))).digest('hex'));

  const queue = [...todo];
  let done = 0;

  async function worker(idx) {
    for (;;) {
      const a = queue.shift();
      if (!a) return;
      if (existsSync(join(OUT, `${a.id}.png`))) { done++; continue; }
      a._tries = (a._tries ?? 0) + 1;
      try {
        const seed = Number.parseInt(createHash('md5').update(a.id).digest('hex').slice(0, 6), 16) + a._tries;
        const r = await fetchImage(`Generate an image. ${a.prompt}`, seed);
        if (r.err) {
          if (a._tries < 5) { queue.push(a); await sleep(r.err === 429 ? 30_000 : 10_000); }
          else console.log(`[p${idx}] ${a.id}: FAIL ${r.err} (tries exhausted)`);
          continue;
        }
        const buf = await scrubWatermark(r.buf);
        const h = createHash('md5').update(buf).digest('hex');
        if (seen.has(h)) {
          queue.push(a);
          console.log(`[p${idx}] ${a.id}: dup-image - requeued`);
          await sleep(3000);
          continue;
        }
        seen.add(h);
        writeFileSync(join(OUT, `${a.id}.png`), buf);
        done++;
        console.log(`[p${idx}] ${a.id}: saved (${done}/${todo.length})`);
        await sleep(2000);
      } catch (e) {
        if (a._tries < 5) { queue.push(a); await sleep(15_000); }
        else console.log(`[p${idx}] ${a.id}: FAIL ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  console.log(`[artgen-polli] done - ${done}/${todo.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
