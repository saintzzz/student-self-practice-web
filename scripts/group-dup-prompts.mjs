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

// desired shared vg per question id
const desired = new Map();
let flagged = 0, transitiveMembers = 0;
for (const [k, g] of byKey) {
  if (g.length < 2) continue;
  const memberVgs = new Set(g.map((q) => q.variant_group_id).filter(Boolean));
  if (memberVgs.size === 1 && g.every((q) => q.variant_group_id === [...memberVgs][0])) {
    // all members share ONE vg - but siblings of that vg outside the
    // bucket may still need transit merge, handled below via touched set
  }
  flagged += 1;
  const shared =
    [...memberVgs].find((v) => !v.startsWith('dup-'))
    ?? [...memberVgs][0]
    ?? `dup-${createHash('md5').update(k).digest('hex').slice(0, 16)}`;
  // transitive merge: every question holding any member vg joins shared
  for (const vg of memberVgs) {
    for (const q of byVg.get(vg) ?? []) {
      if (desired.get(q.id) !== shared) {
        if (desired.has(q.id)) transitiveMembers += 1;
        desired.set(q.id, shared);
      }
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
