#!/usr/bin/env node
// OpenRouter image-gen for manifest-fixes (wrong-subject concepts). Reads
// OPENAI_API_KEY (an OpenRouter key) from the sibling project's .env.local.
// Output: artgen-out/{id}.png, same contract as run.mjs.
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './manifest-fixes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const envPath = 'C:/Users/linhl/LOCAL_DEVIN/so-chu-nhiem-so/.env.local';
let KEY = process.env.OPENAI_API_KEY;
if (!KEY && existsSync(envPath)) {
  const m = readFileSync(envPath, 'utf8').match(/^OPENAI_API_KEY=(.+)$/m);
  if (m) KEY = m[1].trim().replace(/^["']|["']$/g, '');
}
if (!KEY) { console.error('no OPENAI_API_KEY found'); process.exit(1); }

const MODEL = process.env.GENFIX_MODEL || 'google/gemini-2.5-flash-image';
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = ASSETS.filter((a) => (want.length ? want.includes(a.id) : true))
  .filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
console.log(`[genfix-or] ${todo.length} asset(s) via ${MODEL}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const a of todo) {
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: a.prompt }],
          modalities: ['image', 'text'],
        }),
        signal: AbortSignal.timeout(180_000),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = attempt * 30_000;
        console.log(`[genfix-or] ${a.id}: http ${res.status}, wait ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      const j = await res.json();
      const imgUrl = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imgUrl) {
        console.log(`[genfix-or] ${a.id}: no image (${JSON.stringify(j).slice(0, 200)})`);
        break;
      }
      const b64 = imgUrl.split(',')[1];
      writeFileSync(join(OUT, `${a.id}.png`), Buffer.from(b64, 'base64'));
      console.log(`[genfix-or] ${a.id}: saved`);
      ok = true;
    } catch (e) {
      console.log(`[genfix-or] ${a.id}: ${e.message}`);
      await sleep(10_000);
    }
  }
  if (!ok) console.log(`[genfix-or] ${a.id}: GAVE UP`);
  await sleep(2_000);
}
console.log('[genfix-or] done');
