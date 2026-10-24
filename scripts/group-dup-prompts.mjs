#!/usr/bin/env node
/**
 * CR-110 companion: assign a shared variant_group_id to eligible
 * questions that are identical on (grade|subject|prompt|statement|
 * transcript|correct-answer) so the fetch dedup can never co-serve two
 * copies in one exam. Mirrors the audit's dup-prompt-same-grade key.
 *
 * Only touches rows inside flagged groups (members whose variant_group
 * ids are absent or inconsistent). Groups where every member already
 * shares one vg are skipped. Rows that already have a vg inside a
 * flagged group keep it - the shared id is taken from any member that
 * has one, else minted as dup-<stable-hash>.
 *
 *   node scripts/group-dup-prompts.mjs           # dry-run
 *   node scripts/group-dup-prompts.mjs --apply
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const APPLY = process.argv.includes('--apply');

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  const p = join(homedir(), '.config/devin/secrets/supabase_new_keys.json');
  return JSON.parse(readFileSync(p, 'utf8')).keys.service_role;
}
const KEY = serviceKey();
const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
};

async function fetchAll(cols) {
  const out = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/qb_questions?select=${cols}&order=id&offset=${off}&limit=${PAGE}`,
      { headers: HEADERS, signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok) throw new Error(`fetch: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number'
    ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};
const eligible = (q) =>
  q.publication_policy?.practiceEligible || q.publication_policy?.examEligible || q.publication_policy?.mockEligible;

const questions = await fetchAll(
  'id,grade,subject,prompt_text,statement,transcript,choices,answer,variant_group_id,publication_policy',
);

const byKey = new Map();
for (const q of questions) {
  if (!eligible(q)) continue;
  const disc = ((q.prompt_text ?? '') + '|' + (q.statement ?? '') + '|' + (q.transcript ?? '')).trim().toLowerCase();
  const k = `${q.grade}|${q.subject}|${disc}|${correctLabel(q).toLowerCase()}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(q);
}

const updates = new Map(); // id -> variant_group_id
let groups = 0;
for (const [k, g] of byKey) {
  if (g.length < 2) continue;
  const vgs = new Set(g.map((q) => q.variant_group_id));
  if (vgs.size === 1 && [...vgs][0]) continue; // already grouped
  const shared = [...vgs].find(Boolean)
    ?? `dup-${createHash('md5').update(k).digest('hex').slice(0, 16)}`;
  groups += 1;
  for (const q of g) {
    if (q.variant_group_id !== shared) updates.set(q.id, shared);
  }
}

console.log(`flagged groups: ${groups}, rows to update: ${updates.size}`);
if (APPLY) {
  // batch PATCH per target group id
  const byVg = new Map();
  for (const [id, vg] of updates) {
    if (!byVg.has(vg)) byVg.set(vg, []);
    byVg.get(vg).push(id);
  }
  let ok = 0;
  for (const [vg, ids] of byVg) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/qb_questions?id=in.(${ids.map(encodeURIComponent).join(',')})`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ variant_group_id: vg }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok) throw new Error(`PATCH ${vg}: ${res.status} ${await res.text()}`);
    ok += ids.length;
  }
  console.log(`applied: ${ok} rows updated`);
} else {
  console.log('dry-run - pass --apply to patch');
}
