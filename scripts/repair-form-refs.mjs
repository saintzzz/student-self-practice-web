#!/usr/bin/env node
/**
 * CR-110: repair static exam-form payloads in practice.qb_exam_forms.
 *
 * Defect classes repaired (from scripts/qb-content-audit.mjs):
 *   - form references a review_status='rejected'/'draft' question
 *     (admin-previewed teacher forms must never contain quarantined items)
 *   - form question missing/empty answerKey entry
 *   - form answerKey disagrees with the stored question answer
 *   - two questions in one form share a variant group (duplicate slot)
 *
 * Substitution rule: same grade + subject + question_type, prefer same
 * skill; review_status='approved' is the bar (pool-eligibility flags do
 * NOT apply to rubric types - speaking/CR items are legal members of
 * teacher-administered forms by design). A substitute must not already
 * be in the form and must not share a variant_group with any remaining
 * or already-assigned member.
 *
 * answerKey rebuild: every questionId gets an entry derived from the
 * question's stored answer ({text,index}/{boolean}/{text}/{accepted}/...)
 * or {mode:'rubric'} for speaking-prompt/constructed-response.
 *
 * Usage:
 *   node scripts/repair-form-refs.mjs           # dry-run report
 *   node scripts/repair-form-refs.mjs --apply   # PATCH payloads
 *
 * Auth: service_role key (read) + write via REST PATCH (service role
 * bypasses RLS). Same credential source as qb-content-audit.mjs.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pagedAll } from './lib/paged.mjs';

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

async function fetchAll(table, cols) {
  return pagedAll(`${SUPA_URL}/rest/v1/${table}?select=${cols}`, { headers: HEADERS, timeout: 30000 });
}

// Same near-dup key as qb-content-audit.mjs `form-near-dup-content`:
// two members are the same question when they are identical modulo
// person names and numbers.
const NORM_NAMES = /\b(Peter|Mai|Lan|Nam|Hoa|Lucy|Anna|Tom|Minh|Linh|Hung|Phong|Linda|Mary|John|David|Amy|Jack|Ben|Sue|Bill|Nick|Tony|Alice|Jane|Kate|Mike|Sam|Sarah|Emma|Leo|Max|Nina|Alex|Vy|Trang|Dung|Long|Ha|Binh|Anh|Quan|Tuan|Nga|Thu|Thao|Hieu|Khanh|Bao|Chi|Duy|Giang|Huong|Khoa|Lam|My|Ngoc|Oanh|Phuong|Quynh|Son|Thanh|Trinh|Uyen|Viet|Xuan|Yen)\b/gi;
const normText = (s) =>
  String(s ?? '').toLowerCase().replace(NORM_NAMES, 'x')
    .replace(/\d+/g, '#')
    .replace(/[^a-z#]+/g, ' ').replace(/\s+/g, ' ').trim();
const nearDupKey = (q) => {
  if (/order|reorder|sentence-build/i.test(q.question_type ?? '') || /put the words in order/i.test(q.prompt_text ?? '')) {
    const bank = (q.prompt_text ?? '').split(':').slice(1).join(' ');
    const t = normText(bank.length > 5 ? bank : (q.answer?.text ?? ''));
    return 'ro:' + t.split(' ').sort().join(' ');
  }
  const ctx = normText((q.passage ?? '') + ' ' + (q.statement ?? '') + ' ' + (q.transcript ?? ''));
  if (ctx.length >= 15) return 'ctx:' + ctx;
  const p = normText(q.prompt_text);
  if (p.split(' ').length < 6) return 'short:' + q.id;
  const ch = Array.isArray(q.choices)
    ? q.choices.map((c) => normText(typeof c === 'string' ? c : c?.assetId ?? c?.label ?? c?.text ?? '')).sort().join('|')
    : '';
  return 'qa:' + p + '|' + ctx + '|' + ch;
};

const RUBRIC = new Set(['speaking-prompt', 'constructed-response']);
const keyFor = (q) =>
  RUBRIC.has(q.question_type) ? { mode: 'rubric' } : (q.answer ?? { mode: 'rubric' });

const [forms, questions, blueprints] = await Promise.all([
  fetchAll('qb_exam_forms', 'id,grade,subject,kind,blueprint_id,payload'),
  fetchAll(
    'qb_questions',
    'id,grade,subject,skill,question_type,review_status,variant_group_id,answer,content_hash,canonical,publication_policy,prompt_text,passage,statement,transcript,choices',
  ),
  fetchAll('qb_exam_blueprints', 'id,payload'),
]);
const bpById = new Map(blueprints.map((b) => [b.id, b.payload ?? {}]));
const formBlueprintId = (f) =>
  f.blueprint_id ?? f.payload?.blueprintId ?? f.id.replace(/-form-\d+$/, '');
const qById = new Map(questions.map((q) => [q.id, q]));

// membership rule per form kind (r126): 'assignment' forms are
// student-facing via assignment_form RPC - their members must satisfy
// the same eligibility as _assignment_mint_form. Teacher forms
// (diagnostic/midterm/final/unit-test) are is_admin previews where
// approved rubric items are legal, so 'approved' is the bar there.
const mintEligible = (q) =>
  q.canonical
  && q.review_status !== 'rejected' && q.review_status !== 'draft'
  && q.question_type !== 'constructed-response' && q.question_type !== 'speaking-prompt'
  && (q.publication_policy?.commercialReleaseEligible === true)
  && (q.publication_policy?.requiresHumanApprovalForCommercialRelease !== true)
  && (q.publication_policy?.mockEligible === true)
  && (q.publication_policy?.requiresHumanApprovalForExam !== true);

const badMember = (q, kind) =>
  kind === 'assignment' ? !mintEligible(q)
                        : (q.review_status === 'rejected' || q.review_status === 'draft');

// candidate pool per kind: assignment needs mint-eligible subs of any
// scorable type; teacher forms accept approved items of the SAME type
const poolMint = new Map();
const poolApproved = new Map();
const poolApprovedGS = new Map(); // grade|subject fallback across types
const NON_RUBRIC = (q) => !RUBRIC.has(q.question_type);
for (const q of questions) {
  if (q.review_status === 'approved') {
    const k = `${q.grade}|${q.subject}|${q.question_type}`;
    if (!poolApproved.has(k)) poolApproved.set(k, []);
    poolApproved.get(k).push(q);
    if (NON_RUBRIC(q)) {
      const g = `${q.grade}|${q.subject}`;
      if (!poolApprovedGS.has(g)) poolApprovedGS.set(g, []);
      poolApprovedGS.get(g).push(q);
    }
  }
  if (mintEligible(q)) {
    const k = `${q.grade}|${q.subject}|*`;
    if (!poolMint.has(k)) poolMint.set(k, []);
    poolMint.get(k).push(q);
  }
}

const report = { forms: 0, substituted: 0, dropped: 0, toppedUp: 0, unfixed: [], missingIds: [], keyFixed: 0, dupFixed: 0 };
const updates = [];

for (const f of forms) {
  const p = f.payload ?? {};
  const qids = p.questionIds ?? [];
  if (!qids.length) continue;
  const inForm = new Set(qids);
  const usedGroups = new Set(
    qids.map((id) => qById.get(id)?.variant_group_id).filter(Boolean),
  );

  const isAssignment = f.kind === 'assignment';
  const usedNd = new Set();
  const pickSub = (bad) => {
    const typed = isAssignment
      ? (poolMint.get(`${bad.grade}|${bad.subject}|*`) ?? [])
      : (poolApproved.get(`${bad.grade}|${bad.subject}|${bad.question_type}`) ?? []);
    // teacher forms: when the same-type pool cannot supply a non-dup sub,
    // fall back to any non-rubric approved item of the same grade+subject
    // (blueprints constrain targetQuestions only, not the type mix).
    const cands = isAssignment ? typed
      : [...typed, ...(poolApprovedGS.get(`${bad.grade}|${bad.subject}`) ?? [])
          .filter((c) => c.question_type !== bad.question_type)];
    const same = cands.filter(
      (c) => !inForm.has(c.id)
        && (!c.variant_group_id || !usedGroups.has(c.variant_group_id))
        && !usedNd.has(nearDupKey(c)),
    );
    const bySkill = same.filter((c) => c.skill === bad.skill);
    const list = bySkill.length ? bySkill : same;
    if (!list.length) return null;
    const sub = list[Math.floor(Math.random() * list.length)];
    inForm.add(sub.id);
    if (sub.variant_group_id) usedGroups.add(sub.variant_group_id);
    usedNd.add(nearDupKey(sub));
    return sub;
  };

  // 1) substitute rejected/draft members + duplicate variant slots +
  //    members that are near-duplicates (same template modulo names) of
  //    an earlier kept member
  const seenGroups = new Map();
  const newIds = [];
  let changed = false;
  for (const id of qids) {
    const q = qById.get(id);
    const dupKey = q
      ? (q.variant_group_id ?? `h:${q.content_hash ?? q.id}`)
      : `missing:${id}`;
    const isBadStatus = q ? badMember(q, f.kind) : true; // missing id is always bad
    const ndKey = q ? nearDupKey(q) : null;
    const isDup = seenGroups.has(dupKey)
      || (ndKey && ndKey.length >= 20 && usedNd.has(ndKey));
    if (!isBadStatus && !isDup) {
      newIds.push(id);
      seenGroups.set(dupKey, id);
      if (ndKey) usedNd.add(ndKey);
      continue;
    }
    const sub = q ? pickSub(q) : null;
    if (!q) report.missingIds.push(`${f.id} -> ${id} (question row absent)`);
    if (sub) {
      newIds.push(sub.id);
      seenGroups.set(sub.variant_group_id ?? dupKey, sub.id);
      report.substituted += 1;
      if (isDup) report.dupFixed += 1;
      changed = true;
    } else {
      // no substitute available - drop the slot rather than serve bad content
      report.unfixed.push(`${f.id} -> ${id}`);
      report.dropped += 1;
      changed = true;
    }
  }

  // 1b) top up forms that dropped below their blueprint targetQuestions
  //     (e.g. a near-dup member removed with no same-type substitute)
  const target = bpById.get(formBlueprintId(f))?.targetQuestions;
  if (target && newIds.length < target) {
    const pool = isAssignment
      ? (poolMint.get(`${f.grade}|${f.subject}|*`) ?? [])
      : (poolApprovedGS.get(`${f.grade}|${f.subject}`) ?? []);
    for (const c of pool) {
      if (newIds.length >= target) break;
      if (inForm.has(c.id)) continue;
      if (c.variant_group_id && usedGroups.has(c.variant_group_id)) continue;
      const k = nearDupKey(c);
      if (k.length >= 20 && usedNd.has(k)) continue;
      newIds.push(c.id);
      inForm.add(c.id);
      if (c.variant_group_id) usedGroups.add(c.variant_group_id);
      usedNd.add(k);
      report.toppedUp += 1;
      changed = true;
    }
    if (newIds.length < target) report.unfixed.push(`${f.id} -> blueprint shortfall ${newIds.length}/${target}`);
  }

  // 2) rebuild answerKey for every member (fixes missing/empty/mismatch)
  const key = {};
  let keyChanged = false;
  const oldKey = p.answerKey ?? {};
  for (const id of newIds) {
    const q = qById.get(id);
    if (!q) continue;
    const entry = keyFor(q);
    key[id] = entry;
    const prev = oldKey[id];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(entry)) keyChanged = true;
  }
  for (const id of Object.keys(oldKey)) {
    if (!key[id]) keyChanged = true; // stale key for a removed question
  }
  if (keyChanged) report.keyFixed += 1;

  if (changed || keyChanged) {
    report.forms += 1;
    const np = { ...p, questionIds: newIds, answerKey: key, totalQuestions: newIds.length };
    updates.push({ id: f.id, payload: np });
  }
}

console.log(`forms scanned: ${forms.length}`);
console.log(`forms needing repair: ${report.forms}`);
console.log(`rejected/draft/dup slots substituted: ${report.substituted} (dup: ${report.dupFixed})`);
console.log(`slots dropped (no substitute): ${report.dropped}`);
console.log(`slots added to reach blueprint target: ${report.toppedUp}`);
console.log(`forms with answerKey rebuilt: ${report.keyFixed}`);
if (report.unfixed.length) {
  console.log('unresolved refs:');
  for (const u of report.unfixed.slice(0, 20)) console.log(`  ${u}`);
}
if (report.missingIds.length) {
  console.log(`MISSING question ids (unresolvable): ${report.missingIds.length}`);
  for (const u of report.missingIds.slice(0, 20)) console.log(`  ${u}`);
}

if (APPLY) {
  // fail loudly before touching any form when a member id references a
  // question row that does not exist at all (r127). A bad member with no
  // substitute is dropped by design - the audit's form-blueprint-size
  // check guards any resulting shrinkage.
  if (report.missingIds.length) {
    console.error('ABORT: unresolved refs - fix or substitute manually before applying');
    process.exit(1);
  }
  const shortfalls = report.unfixed.filter((u) => /blueprint shortfall/.test(u));
  if (shortfalls.length) {
    console.error(`ABORT: ${shortfalls.length} forms still below blueprint targetQuestions after top-up:`);
    for (const s of shortfalls.slice(0, 20)) console.error(`  ${s}`);
    process.exit(1);
  }
  let ok = 0;
  for (const u of updates) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/qb_exam_forms?id=eq.${encodeURIComponent(u.id)}`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ payload: u.payload }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) throw new Error(`PATCH ${u.id}: ${res.status} ${await res.text()}`);
    ok += 1;
  }
  console.log(`applied: ${ok} forms patched`);
} else {
  console.log('dry-run - pass --apply to patch');
}
