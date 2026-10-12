import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
async function fetchRetry(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) return r;
    last = r.status;
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`HTTP ${last}`);
}
const r = await fetch(`${keys.url}/rest/v1/qb_questions?select=id&limit=1000`);
