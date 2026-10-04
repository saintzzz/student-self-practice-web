#!/usr/bin/env node
/**
 * Repair qb_exam_forms bundles: every slot in a form must be a distinct,
 * eligible question with a matching answerKey entry.
 *
 *   - duplicate variant groups / identical content inside one form -> swap
 *     for another eligible question from the same grade+subject (+unit when
 *     the form is a unit test), preferring same question_type / transcript /
 *     asset profile; drop the slot if no replacement exists.
 *   - ineligible (flagged/excluded) questions -> same swap-or-drop.
 *   - missing answerKey entries / mismatched keys -> rebuilt from the
 *     question's stored answer.
 *
 * Idempotent: a form needing no changes is skipped.
 *
 * Usage: node scripts/v6-form-fix.mjs [--dry]
 * Env: SUPABASE_SERVICE_KEY (or secrets file fallback).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const DRY = process.argv.includes('--dry');

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  return JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8')).keys.service_role;
}
const KEY = serviceKey();
const H = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
};

async function fetchAll(table, cols, order = 'id') {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=${cols}&order=${order}&offset=${off}&limit=1000`, { headers: H });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number' ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text !== undefined) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};
const eligible = (q) => q.publication_policy?.practiceEligible || q.publication_policy?.examEligible || q.publication_policy?.mockEligible;
const contentKey = (q) => q.variant_group_id ?? `${(q.prompt_text ?? '').trim().toLowerCase()}|${correctLabel(q).toLowerCase()}`;

// Same normalization as qb-content-audit's form-near-dup-content check:
// two slots collide when their content is identical modulo names/numbers.
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
    ? q.choices.map((c) => normText(choiceLabel(c))).sort().join('|')
    : '';
  return 'qa:' + p + '|' + ctx + '|' + ch;
};

function answerKeyEntry(q) {
  const a = q.answer ?? {};
  if (a.index !== undefined) return { text: correctLabel(q), index: a.index };
  if (a.text !== undefined) return { text: String(a.text) };
  if (a.boolean !== undefined) return { text: String(a.boolean) };
  if (Array.isArray(a.sequence)) return { text: a.sequence.join(' ') };
  return { accepted: ['open-response'] };
}

const questions = await fetchAll('qb_questions',
  'id,grade,subject,question_type,prompt_text,passage,statement,transcript,choices,answer,publication_policy,variant_group_id,review_status');
const assetIds = new Set((await fetchAll('qb_question_assets', 'question_id', 'question_id')).map((l) => l.question_id));
const forms = await fetchAll('qb_exam_forms', 'id,grade,subject,kind,payload');
const qById = new Map(questions.map((q) => [q.id, q]));

// unit prefix for unit-test questions, e.g. g3-gs-u01-...
const unitOf = (id) => id.match(/^g\d-gs-u\d{2}/)?.[0] ?? id.match(/^(g\d)-[a-z]+-v\d/)?.[1];

function replacementFor(form, oldQ, usedKeys, usedIds) {
  const wantUnit = form.kind === 'unit-test' ? unitOf(oldQ.id) : null;
  const pool = questions.filter((q) =>
    q.id !== oldQ.id && !usedIds.has(q.id) && eligible(q) &&
    q.grade === form.grade && q.subject === form.subject &&
    !usedKeys.has(contentKey(q)) && !usedKeys.has(nearDupKey(q)) &&
    (wantUnit ? unitOf(q.id) === wantUnit : true));
  const score = (q) =>
    (q.question_type === oldQ.question_type ? 4 : 0) +
    (Boolean(q.transcript) === Boolean(oldQ.transcript) ? 2 : 0) +
    (assetIds.has(q.id) === assetIds.has(oldQ.id) ? 2 : 0);
  pool.sort((a, b) => score(b) - score(a));
  return pool[0];
}

let patched = 0, swapped = 0, dropped = 0, rekeyed = 0;
for (const f of forms) {
  const ids = [...(f.payload?.questionIds ?? [])];
  const key = { ...(f.payload?.answerKey ?? {}) };
  const usedKeys = new Set(), usedIds = new Set();
  let changed = false;

  const newIds = [];
  for (const id of ids) {
    const q = qById.get(id);
    const ck = q ? contentKey(q) : null;
    const nk = q ? nearDupKey(q) : null;
    const isDup = q && (usedKeys.has(ck) || usedKeys.has(nk) || usedIds.has(id));
    const bad = !q || isDup || !eligible(q);
    if (!bad) {
      newIds.push(id); usedKeys.add(ck); usedKeys.add(nk); usedIds.add(id);
      continue;
    }
    const reason = !q ? 'missing' : isDup ? 'duplicate-variant' : 'ineligible';
    const rep = q ? replacementFor(f, q, usedKeys, usedIds) : null;
    if (rep) {
      newIds.push(rep.id); usedKeys.add(contentKey(rep)); usedKeys.add(nearDupKey(rep)); usedIds.add(rep.id);
      delete key[id]; key[rep.id] = answerKeyEntry(rep);
      swapped++; console.log(`${f.id}: swap ${id} (${reason}) -> ${rep.id}`);
    } else {
      delete key[id];
      dropped++; console.log(`${f.id}: drop ${id} (${reason}, no replacement)`);
    }
    changed = true;
  }

  // rebuild answerKey coverage + mismatches
  for (const id of newIds) {
    const q = qById.get(id);
    if (!q) continue;
    const want = answerKeyEntry(q);
    const cur = key[id];
    const ok = cur && (!want.text || String(cur.text ?? '') === want.text) &&
      (want.index === undefined || cur.index === want.index);
    if (!ok) { key[id] = cur?.rubric || cur?.rubricVi ? cur : want; rekeyed++; changed = true; }
  }
  for (const id of Object.keys(key)) if (!newIds.includes(id)) { delete key[id]; changed = true; }

  if (!changed) continue;
  patched++;
  const payload = { ...f.payload, questionIds: newIds, answerKey: key, totalQuestions: newIds.length };
  if (!DRY) {
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_exam_forms?id=eq.${f.id}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) console.log(`PATCH ${f.id}: ${res.status} ${(await res.text()).slice(0, 120)}`);
  }
}
console.log(`\nforms patched: ${patched} | swapped: ${swapped} | dropped: ${dropped} | rekeyed: ${rekeyed}${DRY ? ' (dry)' : ''}`);
