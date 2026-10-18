#!/usr/bin/env node
/**
 * qb-form-repair.mjs - repair qb_exam_forms questionIds after content cleanup.
 *
 * Defect classes from qb-content-audit:
 *   form-missing-question    - id in questionIds does not exist
 *   form-ineligible-question - id exists but is not serve-eligible
 *   form-duplicate-variant   - two items share variant group / identical content
 *   form-near-dup-content    - two items identical modulo names/numbers
 *
 * Repair: substitute each defective item with an eligible question of the
 * same grade+subject+question_type+skill not already in the form and not
 * colliding on the audit's dup keys. Syncs answerKey + totalQuestions.
 *
 * Dry-run by default; --apply writes via REST PATCH (service key).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const APPLY = process.argv.includes('--apply');

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  const p = join(homedir(), 'AppData', 'Roaming', 'devin', 'secrets', 'supabase_new_keys.json');
  return JSON.parse(readFileSync(p, 'utf8')).keys.service_role;
}
const SKEY = serviceKey();
const H = {
  apikey: SKEY, Authorization: `Bearer ${SKEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};

async function fetchTable(table, cols, order = 'id') {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${cols}&order=${order}&offset=${off}&limit=1000`,
      { headers: H, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const eligible = (q) =>
  q.publication_policy?.practiceEligible ||
  q.publication_policy?.examEligible ||
  q.publication_policy?.mockEligible;
const servable = (q) =>
  eligible(q) && q.canonical && !['rejected', 'draft'].includes(q.review_status) &&
  q.publication_policy?.commercialReleaseEligible === true;

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number' ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};

// Dup keys - mirror qb-content-audit.mjs exactly so repaired forms pass its checks.
const dupKey = (q) =>
  q.variant_group_id ?? `${(q.prompt_text ?? '').toLowerCase()}|${correctLabel(q).toLowerCase()}`;

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

console.log('fetching questions + forms...');
const questions = await fetchTable('qb_questions',
  'id,grade,subject,skill,question_type,topic_key,canonical,review_status,publication_policy,answer,choices,variant_group_id,prompt_text,passage,statement,transcript');
const forms = await fetchTable('qb_exam_forms', 'id,grade,subject,kind,payload');
const qById = new Map(questions.map((q) => [q.id, q]));

const candIndex = new Map();
const candByGs = new Map();
for (const q of questions) {
  if (!servable(q)) continue;
  const k4 = `${q.grade}|${q.subject}|${q.question_type}|${q.skill}`;
  (candIndex.get(k4) ?? candIndex.set(k4, []).get(k4)).push(q);
  const kg = `${q.grade}|${q.subject}`;
  (candByGs.get(kg) ?? candByGs.set(kg, []).get(kg)).push(q);
}

const pickSub = (form, bad, taken, seenDup, seenNear) => {
  const pools = [
    candIndex.get(`${form.grade}|${form.subject}|${bad?.question_type}|${bad?.skill}`) ?? [],
    candByGs.get(`${form.grade}|${form.subject}`) ?? [],
  ];
  for (const pool of pools) {
    for (const c of pool) {
      if (taken.has(c.id) || seenDup.has(dupKey(c))) continue;
      const nk = nearDupKey(c);
      if (nk.length >= 20 && seenNear.has(nk)) continue;
      return c;
    }
  }
  return null;
};

const stats = { formsTouched: 0, missingDropped: 0, missingSwapped: 0, ineligibleSwapped: 0, ineligibleDropped: 0, dupSwapped: 0, dupDropped: 0, patches: [] };
for (const f of forms) {
  const ids = [...(f.payload?.questionIds ?? [])];
  const answerKey = { ...(f.payload?.answerKey ?? {}) };
  let changed = false;
  const taken = new Set(ids);
  const seenDup = new Set();
  const seenNear = new Set();
  const newIds = [];
  for (const id of ids) {
    const q = qById.get(id);
    const dk = q ? dupKey(q) : `missing|${id}`;
    const nk = q ? nearDupKey(q) : '';
    const isDup = seenDup.has(dk) || (nk.length >= 20 && seenNear.has(nk));
    if (q && eligible(q) && !isDup) {
      newIds.push(id);
      seenDup.add(dk);
      if (nk.length >= 20) seenNear.add(nk);
      continue;
    }
    changed = true;
    const sub = pickSub(f, q, taken, seenDup, seenNear);
    if (sub) {
      newIds.push(sub.id);
      taken.add(sub.id);
      seenDup.add(dupKey(sub));
      const snk = nearDupKey(sub);
      if (snk.length >= 20) seenNear.add(snk);
      answerKey[sub.id] = { text: correctLabel(sub), index: sub.answer?.index };
      if (q && isDup) stats.dupSwapped++;
      else if (q) stats.ineligibleSwapped++;
      else stats.missingSwapped++;
    } else {
      if (q && isDup) stats.dupDropped++;
      else if (q) stats.ineligibleDropped++;
      else stats.missingDropped++;
    }
    delete answerKey[id];
  }
  if (!changed) continue;
  stats.formsTouched++;
  const payload = { ...f.payload, questionIds: newIds, answerKey, totalQuestions: newIds.length };
  stats.patches.push({ id: f.id, before: ids.length, after: newIds.length });
  if (APPLY) {
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_exam_forms?id=eq.${encodeURIComponent(f.id)}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) { console.error(`PATCH ${f.id}: ${res.status} ${await res.text()}`); process.exitCode = 1; }
  }
}

console.log(`${APPLY ? 'APPLIED' : 'DRY-RUN'}:`);
console.log(`  forms touched:       ${stats.formsTouched}`);
console.log(`  missing dropped:     ${stats.missingDropped}`);
console.log(`  missing swapped:     ${stats.missingSwapped}`);
console.log(`  ineligible swapped:  ${stats.ineligibleSwapped}`);
console.log(`  ineligible dropped:  ${stats.ineligibleDropped}`);
console.log(`  dup swapped:         ${stats.dupSwapped}`);
console.log(`  dup dropped:         ${stats.dupDropped}`);
stats.patches.slice(0, 12).forEach((p) => console.log(`  ${p.id}: ${p.before} -> ${p.after}`));
