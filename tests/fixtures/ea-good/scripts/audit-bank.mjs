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
