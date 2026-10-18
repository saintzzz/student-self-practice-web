/**
 * qb-quarantine-apply.mjs — apply classifier quarantine decisions to practice.qb_questions.
 *
 * Reads docs/qa/flagged/reject-ids.json (produced by qb-ambiguity-classify.mjs) and
 * sets review_status='rejected' + all publication eligibility flags false for each id.
 * Idempotent: skips rows already rejected. Dry-run by default; pass --apply to write.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const APPLY = process.argv.includes('--apply');
const REJECT_FILE = 'docs/qa/flagged/reject-ids.json';

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  const p = join(homedir(), 'AppData', 'Roaming', 'devin', 'secrets', 'supabase_new_keys.json');
  return JSON.parse(readFileSync(p, 'utf8')).keys.service_role;
}
const SKEY = serviceKey();
const H = {
  apikey: SKEY,
  Authorization: `Bearer ${SKEY}`,
  'Accept-Profile': 'practice',
  'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};

let manual = [];
try { manual = JSON.parse(readFileSync('docs/qa/flagged/reject-ids-manual.json', 'utf8')); } catch {}
const ids = [...new Set([...JSON.parse(readFileSync(REJECT_FILE, 'utf8')), ...manual])];
console.log(`${APPLY ? 'APPLYING' : 'DRY-RUN'} quarantine for ${ids.length} ids (${manual.length} manual)`);

let done = 0, skipped = 0, failed = 0, repaired = 0;
const CHUNK = 50;
/* r34-B5: the quarantine contract = rejected AND all eligibility flags
   false. An already-rejected row that still advertises
   practiceEligible etc. is a live leak this gate must repair, not
   "done". */
const ELIGIBILITY_FLAGS = ['practiceEligible', 'examEligible', 'mockEligible', 'commercialReleaseEligible'];
const flagsClean = (policy) =>
  ELIGIBILITY_FLAGS.every((f) => policy?.[f] !== true);
const quarantinePolicy = (policy) => ({
  ...(policy ?? {}),
  practiceEligible: false,
  examEligible: false,
  mockEligible: false,
  commercialReleaseEligible: false,
});
const rfetch = async (url, opts = {}, tries = 4) => {
  for (let t = 0; t < tries; t++) {
    try {
      return await fetch(url, { ...opts, signal: AbortSignal.timeout(45000) });
    } catch (e) {
      if (t === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (t + 1)));
    }
  }
};
for (let i = 0; i < ids.length; i += CHUNK) {
  const chunk = ids.slice(i, i + CHUNK);
  const q = `id=in.(${chunk.join(',')})&select=id,review_status,publication_policy`;
  let res;
  try { res = await rfetch(`${SUPA_URL}/rest/v1/qb_questions?${q}`, { headers: H }); }
  catch { console.error('fetch retry-exhausted at chunk', i); failed += chunk.length; continue; }
  if (!res.ok) { console.error('fetch fail', res.status); failed += chunk.length; continue; }
  const rows = await res.json();
  const found = new Map(rows.map((r) => [r.id, r]));
  for (const id of chunk) {
    const row = found.get(id);
    if (!row) { skipped++; continue; }
    /* Already-rejected is only "done" when the eligibility flags are
       also clean - otherwise repair the flag leak (r34-B5). */
    if (row.review_status === 'rejected' && flagsClean(row.publication_policy)) { done++; continue; }
    if (!APPLY) { done++; continue; }
    const policy = quarantinePolicy(row.publication_policy);
    let pr;
    try {
      pr = await rfetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ review_status: 'rejected', publication_policy: policy }),
      });
    } catch { failed++; console.error('patch retry-exhausted', id); continue; }
    if (pr.ok) {
      if (row.review_status === 'rejected') repaired++;
      done++;
    } else { failed++; console.error('patch fail', id, pr.status); }
  }
  console.log(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length} done=${done} repaired=${repaired} missing=${skipped} failed=${failed}`);
}
console.log(`RESULT: ${done} quarantined (${repaired} flag-repairs), ${skipped} missing, ${failed} failed`);
/* r34-B5: a run that failed any row must not exit 0 - callers treat the
   exit code as the gate verdict. */
if (failed > 0) process.exitCode = 1;
