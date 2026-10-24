#!/usr/bin/env node
/**
 * CR-110 companion: assign a shared variant_group_id to eligible
 * questions that are identical on
 * (grade|subject|type|prompt|statement|transcript|passage|correct-answer)
 * so the fetch dedup can never co-serve two copies in one exam.
 * Mirrors the audit's dup-prompt-same-grade key (r126: passage and
 * question_type are part of the identity - generic T/F prompts with
 * different passages are DISTINCT questions).
 *
 * Merge semantics (r126): variant groups are transitive. When a flagged
 * content bucket touches existing group ids (e.g. one member has vg=B),
 * EVERY question holding vg=B is merged into the shared id - leaving
 * siblings behind would let previously excluded variants co-appear.
 * Preference for the shared id: a non-"dup-" vg already held by a
 * member > an existing "dup-" vg > a freshly minted dup-<hash>.
 *
 * Also repairs state from the first (passage-blind) run: any row whose
 * dup-* id no longer corresponds to a required shared id is reset to
 * NULL.
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
    let res = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        res = await fetch(
          `${SUPA_URL}/rest/v1/qb_questions?select=${cols}&order=id&offset=${off}&limit=${PAGE}`,
          { headers: HEADERS, signal: AbortSignal.timeout(30000) },
        );
        if (res.ok) break;
        if (res.status >= 500) { res = null; await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
        throw new Error(`fetch: ${res.status} ${await res.text()}`);
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    if (!res?.ok) throw new Error(`fetch: page at offset ${off} failed after retries`);
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
  'id,grade,subject,question_type,prompt_text,statement,transcript,passage,choices,answer,variant_group_id,publication_policy',
);
const byId = new Map(questions.map((q) => [q.id, q]));
const byVg = new Map();
for (const q of questions) {
  if (!q.variant_group_id) continue;
  if (!byVg.has(q.variant_group_id)) byVg.set(q.variant_group_id, []);
  byVg.get(q.variant_group_id).push(q);
}

const keyOf = (q) =>
  `${q.grade}|${q.subject}|${q.question_type}|${((q.prompt_text ?? '') + '|' + (q.statement ?? '') + '|' + (q.transcript ?? '') + '|' + (q.passage ?? '')).trim().toLowerCase()}|${correctLabel(q).toLowerCase()}`;

// content buckets across ALL rows (ineligible rows can still share a vg
// with eligible ones via transitive merge, but only eligible rows form
// flag-eligible buckets)
const byKey = new Map();
for (const q of questions) {
  if (!eligible(q)) continue;
  const k = keyOf(q);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(q);
}

// union-find over question ids (r126): components must be the connected
// closure of content buckets AND existing groups - overlapping buckets
// sharing a vg member are ONE component needing ONE shared id.
const parent = new Map(questions.map((q) => [q.id, q.id]));
const find = (x) => {
  let r = x;
  while (parent.get(r) !== r) r = parent.get(r);
  let n = parent.get(x);
  while (n !== r) { parent.set(x, r); x = n; n = parent.get(x); }
  return r;
};
const union = (a, b) => parent.set(find(a), find(b));

// edge: members of the same content bucket (only buckets with >=2 members
// can force a shared id)
const flaggedBuckets = new Set();
for (const [k, g] of byKey) {
  if (g.length < 2) continue;
  flaggedBuckets.add(k);
  for (let i = 1; i < g.length; i += 1) union(g[0].id, g[i].id);
}
// edge: members of the same ORIGINAL (non-dup) variant group - curated
// groups are transitive by definition. dup-* ids are our own minted
// artifacts; bucket identity is authoritative for them, so they are NOT
// unioned (a stale dup-* on a now-singleton row must reset, not re-merge).
for (const [vg, members] of byVg) {
  if (vg.startsWith('dup-') || members.length < 2) continue;
  for (let i = 1; i < members.length; i += 1) union(members[0].id, members[i].id);
}

// components containing at least one flagged-bucket member get normalized
const compMembers = new Map(); // root -> questions[]
for (const q of questions) {
  const r = find(q.id);
  if (!compMembers.has(r)) compMembers.set(r, []);
  compMembers.get(r).push(q);
}
const bucketOf = new Map();
for (const q of questions) if (eligible(q)) bucketOf.set(q.id, keyOf(q));

const desired = new Map();
let flagged = flaggedBuckets.size, transitiveMembers = 0;
for (const members of compMembers.values()) {
  const inFlagged = members.filter((q) => flaggedBuckets.has(bucketOf.get(q.id)));
  if (!inFlagged.length) continue;
  const memberIds = new Set(members.map((q) => q.id));
  const vgs = new Set(members.map((q) => q.variant_group_id).filter(Boolean));
  // a dup-* id may only be reused when every current holder sits inside
  // this component - otherwise the id was contaminated by a wrong merge
  // and reusing it would resurrect the bad grouping
  const cleanDup = [...vgs].find((v) =>
    v.startsWith('dup-') && (byVg.get(v) ?? []).every((h) => memberIds.has(h.id)));
  const shared =
    [...vgs].find((v) => !v.startsWith('dup-'))
    ?? cleanDup
    ?? `dup-${createHash('md5').update(inFlagged.map((q) => bucketOf.get(q.id)).sort()[0]).digest('hex').slice(0, 16)}`;
  for (const q of members) {
    if (!desired.has(q.id)) {
      desired.set(q.id, shared);
      if (!inFlagged.includes(q)) transitiveMembers += 1;
    }
  }
}

// stale cleanup: rows holding a dup-* id that is not a desired target
const stillNeeded = new Set(desired.values());
const updates = new Map(); // id -> vg | null
for (const q of questions) {
  const want = desired.get(q.id) ?? null;
  const cur = q.variant_group_id ?? null;
  if (cur === want) continue;
  if (want === null && !(cur ?? '').startsWith('dup-')) continue; // don't strip human-curated groups
  updates.set(q.id, want);
}

console.log(`flagged content buckets: ${flagged}`);
console.log(`rows needing update: ${updates.size} (${transitiveMembers} transitive)`);
const nul = [...updates.values()].filter((v) => v === null).length;
console.log(`stale dup-* resets to NULL: ${nul}`);

if (APPLY) {
  const byVg = new Map();
  for (const [id, vg] of updates) {
    const kk = vg ?? '__NULL__';
    if (!byVg.has(kk)) byVg.set(kk, []);
    byVg.get(kk).push(id);
  }
  let ok = 0;
  for (const [vg, ids] of byVg) {
    // chunk ids - PostgREST 'in' lists get long
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const res = await fetch(
        `${SUPA_URL}/rest/v1/qb_questions?id=in.(${chunk.map(encodeURIComponent).join(',')})`,
        {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ variant_group_id: vg === '__NULL__' ? null : vg }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!res.ok) throw new Error(`PATCH ${vg}: ${res.status} ${await res.text()}`);
      ok += chunk.length;
    }
  }
  console.log(`applied: ${ok} rows updated`);
} else {
  console.log('dry-run - pass --apply to patch');
}
