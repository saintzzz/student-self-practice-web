#!/usr/bin/env node
// Gemini image-gen for manifest-fixes (wrong-subject concepts). Reads
// GEMINI_API_KEY from the sibling project's .env.local - never prints it.
// Output: artgen-out/{id}.png, same contract as run.mjs.
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './manifest-fixes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const envPaths = [
  'C:/Users/linhl/devin_app/so-chu-nhiem/.env.local',
  'C:/Users/linhl/LOCAL_DEVIN/so-chu-nhiem-so/.env.local',
];
let KEY = process.env.GEMINI_API_KEY;
for (const p of envPaths) {
  if (KEY || !existsSync(p)) continue;
  const m = readFileSync(p, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
  if (m) KEY = m[1].trim().replace(/^["']|["']$/g, '').split(',')[0].trim();
}
if (!KEY) { console.error('no GEMINI_API_KEY found'); process.exit(1); }

const MODEL = process.env.GENFIX_MODEL || 'gemini-2.5-flash-image';
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = ASSETS.filter((a) => (want.length ? want.includes(a.id) : true))
  .filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
console.log(`[genfix] ${todo.length} asset(s) via ${MODEL}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const a of todo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: a.prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
        signal: AbortSignal.timeout(180_000),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = attempt * 30_000;
        console.log(`[genfix] ${a.id}: http ${res.status}, wait ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      const j = await res.json();
      const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) {
        console.log(`[genfix] ${a.id}: no image part (${JSON.stringify(j).slice(0, 200)})`);
        break;
      }
      writeFileSync(join(OUT, `${a.id}.png`), Buffer.from(part.inlineData.data, 'base64'));
      console.log(`[genfix] ${a.id}: saved`);
      ok = true;
    } catch (e) {
      console.log(`[genfix] ${a.id}: ${e.message}`);
      await sleep(10_000);
    }
  }
  if (!ok) console.log(`[genfix] ${a.id}: GAVE UP`);
  await sleep(2_000); // gentle pacing
}
console.log('[genfix] done');
