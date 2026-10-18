// Pollinations fallback - no-login image generation into artgen-out/.
// Same manifest/output contract as run.mjs (ChatGPT web). Used because the
// ChatGPT login gate was not completed; assets can be regenerated later.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './manifest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'artgen-out');
mkdirSync(OUT, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = ASSETS.filter((a) => (want.length ? want.includes(a.id) : true))
  .filter((a) => !existsSync(join(OUT, `${a.id}.png`)));
console.log(`[fallback] ${todo.length} asset(s)`);

for (const a of todo) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(a.prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${a.id.length * 7919}`;
  try {
    console.log(`[fallback] ${a.id}...`);
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) throw new Error(`too small (${buf.length}b)`);
    writeFileSync(join(OUT, `${a.id}.png`), buf);
    console.log(`[fallback] ${a.id}: ${Math.round(buf.length / 1024)}kB`);
  } catch (e) {
    console.log(`[fallback] ${a.id}: FAIL ${e.message}`);
  }
}
