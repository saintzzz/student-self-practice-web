import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
let SUPA = process.env.SUPABASE_URL;
let SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !SVC) {
  const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
  SUPA ||= keys.url;
  SVC ||= keys.keys.service_role;
}
async function fetchRetry(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (r.ok) return r;
      last = r.status;
      if (last < 500 && last !== 408 && last !== 429) break;
    } catch {
      last = 'timeout';
    }
    if (i < 3) await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`HTTP ${last}`);
}
for (let off = 0; ; off += 1000) {
  const page = await fetchRetry(`${SUPA}/rest/v1/qb_questions?select=id&offset=${off}&limit=1000`);
  const rows = await page.json();
  if (!rows.length) break;
}
// r15 good: reorder tile banks must be a word-multiset permutation of
// the answer under scorer normalization.
const ro = await fetchRetry(`${SUPA}/rest/v1/qb_questions?question_type=eq.reorder&select=id,tokens,answer`);
const roNorm = (s) => String(s).toLowerCase().replace(/[.,!?;:'"]+/gu, '');
let badRo = 0;
for (const q of await ro.json()) {
  if (!Array.isArray(q.tokens)) continue;
  const tiles = q.tokens.join(' ').split(/\s+/).map(roNorm).filter(Boolean).sort().join('|');
  const want = String(q.answer?.text ?? '').split(/\s+/).map(roNorm).filter(Boolean).sort().join('|');
  if (tiles !== want) badRo++;
}
