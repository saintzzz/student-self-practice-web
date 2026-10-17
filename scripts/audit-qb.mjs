#!/usr/bin/env node
/**
 * CR-82-B: repeatable content-validator gate for practice.qb_questions.
 *
 * Runs the full battery a row must pass before it may reach children:
 *   1. structural  - empty prompt/answer, MC with <2 choices, answer text
 *                    not in choices, duplicated choice values
 *   2. set-level   - exact duplicates, contradictory stems (same prompt +
 *                    same choices, different keyed answers)
 *   3. policy      - rejected rows that still carry an *Eligible flag
 *                    (leak), or published rows missing the policy object
 *   4. ambiguity   - cloze MCQs adjudicated by qb-ambiguity-lib selector;
 *                    rows verdict=reject but still published are
 *                    "pending-quarantine" and fail the gate
 *
 * Input: a JSON array of qb_questions rows (all columns). Produce it with:
 *   SELECT id, grade, subject, question_type, prompt_text, transcript,
 *          choices, answer, passage, statement, review_status,
 *          publication_policy
 *   FROM practice.qb_questions;
 * then save as docs/qa/qb-export.json (default --input path).
 *
 *   node scripts/audit-qb.mjs                     -> report, exit 1 on fail
 *   node scripts/audit-qb.mjs --emit-sql <dir>    -> also write quarantine SQL
 *   node scripts/audit-qb.mjs --json out.json     -> machine-readable report
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selector, norm } from './qb-ambiguity-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const INPUT = opt('--input', join(ROOT, 'docs', 'qa', 'qb-export.json'));
const EMIT_DIR = opt('--emit-sql', null);
const JSON_OUT = opt('--json', null);

const rows = JSON.parse(readFileSync(INPUT, 'utf8'));

/* ---------- helpers ---------- */
/* r34-B4: not every string column is JSON-encoded - a primitive answer
   like "cat" must survive instead of aborting the audit. */
const j = (v) => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};
const choiceLabel = (c) =>
  c != null && typeof c === 'object' ? String(c?.assetId ?? c?.id ?? c?.text ?? '') : String(c ?? '');
const choiceArr = (r) => {
  const c = j(r.choices);
  return Array.isArray(c) ? c.map(choiceLabel) : [];
};
const answerText = (r) => {
  const a = j(r.answer);
  if (a == null) return '';
  if (typeof a === 'object' && !Array.isArray(a)) {
    if (a.text != null) return String(a.text);
    // r34-B4: true/false answers carry `{ boolean }` - without this
    // they resolve to '' and evade every answer-side validation.
    if (typeof a.boolean === 'boolean') return String(a.boolean);
    // index-only answers (asset types): resolve to the choice label
    const cs = choiceArr(r);
    return typeof a.index === 'number' ? choiceLabel(cs[a.index]) || String(a.index) : '';
  }
  return String(Array.isArray(a) ? a[0] : a);
};
const isCloze = (p) => /_{3,}|\.{3,}|…|\[\s*\]/.test(p);
const hasContext = (r) =>
  Boolean(r.passage || r.statement || r.transcript) ||
  /image-mcq|visual-count/.test(r.question_type ?? '');

/* ---------- set detection (mirrors the SQL sweep bucketing) ---------- */
const SETS = {
  day: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'weekday', 'weekend', 'today', 'tomorrow', 'yesterday'],
  month: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  prep: ['in', 'on', 'at', 'under', 'between', 'next to', 'in front of', 'behind', 'near', 'across', 'over', 'above', 'through', 'into', 'along', 'by', 'opposite', 'inside', 'outside', 'beside', 'around', 'towards', 'past', 'down', 'up', 'from', 'to', 'for', 'with', 'of', 'after', 'before', 'during', 'until'],
  color: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'grey', 'gray', 'golden', 'silver'],
  animal: ['cat', 'dog', 'rabbit', 'fish', 'bird', 'mouse', 'lion', 'tiger', 'zebra', 'giraffe', 'bear', 'monkey', 'elephant', 'snake', 'hippo', 'rhino', 'fox', 'cow', 'pig', 'chicken', 'duck', 'goat', 'sheep', 'horse', 'frog', 'bee', 'butterfly', 'ant', 'whale', 'panda', 'dove'],
  family: ['father', 'dad', 'brother', 'uncle', 'grandpa', 'son', 'grandfather', 'cousin', 'mother', 'mom', 'mum', 'sister', 'aunt', 'grandma', 'daughter', 'grandmother', 'baby', 'parents', 'family'],
  food: ['rice', 'bread', 'noodles', 'milk', 'juice', 'water', 'tea', 'coffee', 'cake', 'candy', 'cookie', 'cookies', 'chocolate', 'flan', 'pudding', 'ice cream', 'apple', 'banana', 'orange', 'grape', 'mango', 'meat', 'fish', 'chicken', 'egg', 'eggs', 'soup', 'salad', 'sandwich', 'pizza', 'fruit', 'vegetable', 'vegetables', 'food', 'breakfast', 'lunch', 'dinner'],
  job: ['teacher', 'doctor', 'nurse', 'farmer', 'driver', 'cook', 'singer', 'pilot', 'postman', 'reporter', 'police', 'policeman', 'police officer', 'worker', 'engineer', 'baker', 'vet', 'student', 'dentist', 'astronaut'],
  room: ['kitchen', 'bedroom', 'bathroom', 'living room', 'dining room', 'study room', 'garden', 'garage', 'hall', 'toilet'],
  season: ['spring', 'summer', 'autumn', 'fall', 'winter'],
  sport: ['football', 'basketball', 'volleyball', 'tennis', 'badminton', 'table tennis', 'swimming', 'cycling', 'chess', 'running', 'soccer', 'baseball'],
  subject: ['math', 'maths', 'english', 'vietnamese', 'science', 'music', 'art', 'pe', 'it', 'history', 'geography', 'literature'],
};
const detectSet = (choices) => {
  const cs = choices.map(norm);
  let best = ['misc', 0];
  for (const [name, vocab] of Object.entries(SETS)) {
    const hits = cs.filter((c) => vocab.includes(c)).length;
    if (hits > best[1]) best = [name, hits];
  }
  // require a majority of choices to belong to the family, else misc
  return best[1] >= Math.ceil(cs.length * 0.6) ? best[0] : 'misc';
};

/* ---------- run checks ---------- */
const findings = [];
const flag = (check, severity, r, detail) =>
  findings.push({ check, severity, id: r.id, detail });

const MC_TYPES = new Set(['mcq', 'true-false', 'word-to-image-mcq', 'image-to-word-mcq', 'visual-count-mcq']);
const stemMap = new Map(); // grade|prompt|choices -> Set of answers
const rowMap = new Map(); // grade|prompt|choices|answer -> ids[]

for (const r of rows) {
  const p = String(r.prompt_text ?? '').trim();
  const choices = choiceArr(r);
  const aText = answerText(r);

  if (!p) flag('empty-prompt', 'error', r, 'prompt_text blank');
  const aRaw = j(r.answer);
  const aBlank =
    aRaw == null ||
    (typeof aRaw === 'object' &&
      !Array.isArray(aRaw) &&
      aRaw.text == null &&
      aRaw.index == null &&
      aRaw.boolean == null);
  if (aBlank && MC_TYPES.has(r.question_type)) flag('empty-answer', 'error', r, 'answer missing');

  if (MC_TYPES.has(r.question_type)) {
    if (choices.length < 2) flag('mc-few-choices', 'error', r, `only ${choices.length} choice(s)`);
    const ncs = choices.map(norm);
    if (aText && choices.length && !ncs.includes(norm(aText)))
      flag('answer-not-in-choices', 'error', r, `answer "${aText}" not in ${JSON.stringify(choices)}`);
    if (new Set(ncs).size !== ncs.length)
      flag('dup-choice', 'error', r, `duplicated choice values ${JSON.stringify(choices)}`);

    const stemKey = `${r.grade}|${norm(p)}|${[...ncs].sort().join('|')}`;
    (stemMap.get(stemKey) ?? stemMap.set(stemKey, { answers: new Set(), ids: [] }).get(stemKey)).answers.add(norm(aText));
    stemMap.get(stemKey).ids.push(r.id);
    const rowKey = `${stemKey}|${norm(aText)}`;
    (rowMap.get(rowKey) ?? rowMap.set(rowKey, []).get(rowKey)).push(r.id);
  }

  // policy leak: rejected row still carrying eligibility
  if (r.review_status === 'rejected' && r.publication_policy) {
    const pol = j(r.publication_policy);
    for (const k of ['practiceEligible', 'examEligible', 'mockEligible', 'commercialReleaseEligible'])
      if (pol[k] === true) flag('policy-leak', 'error', r, `rejected but ${k}=true`);
  }
  if (!r.publication_policy && r.review_status !== 'rejected')
    flag('policy-missing', 'warn', r, 'publication_policy absent');
}

// set-level checks
for (const [key, { answers, ids }] of stemMap) {
  if (answers.size > 1)
    flag('contradictory', 'error', { id: ids[0] }, `same stem+choices, answers ${JSON.stringify([...answers])} (ids: ${ids.slice(0, 5).join(',')}${ids.length > 5 ? '…' : ''})`);
}
for (const [key, ids] of rowMap) {
  if (ids.length > 1)
    flag('exact-dup', 'warn', { id: ids[0] }, `${ids.length} identical rows (${ids.slice(0, 5).join(',')}${ids.length > 5 ? '…' : ''})`);
}

// ambiguity adjudication on published cloze MCQs (true-false needs a
// different oracle - statement truth, not blank uniqueness - skip here)
const pending = [];
for (const r of rows) {
  if (r.question_type !== 'mcq') continue;
  if (r.review_status === 'rejected' || r.review_status === 'draft') continue;
  const p = String(r.prompt_text ?? '');
  const choices = choiceArr(r);
  if (!isCloze(p) || choices.length < 2 || hasContext(r)) continue;
  const set = detectSet(choices);
  if (!selector(p, answerText(r), choices, set)) pending.push(r.id);
}
for (const id of pending)
  flag('pending-quarantine', 'error', { id }, 'cloze ambiguity: selector proves no unique answer but row still published');

/* ---------- emit ---------- */
const byCheck = {};
for (const f of findings) (byCheck[f.check] ??= { error: 0, warn: 0, ids: [] })[f.severity]++;
for (const f of findings) byCheck[f.check].ids.push(f.id);

console.log(`rows: ${rows.length}`);
let fail = 0;
for (const [name, c] of Object.entries(byCheck).sort()) {
  const sev = c.error ? 'ERROR' : 'warn ';
  console.log(`  ${sev} ${name}: ${c.error + c.warn} (unique ids: ${new Set(c.ids).size})`);
  if (c.error) fail++;
}
if (!Object.keys(byCheck).length) console.log('  all checks clean');

const report = { rows: rows.length, checks: byCheck, pending_quarantine: pending };
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));

if (EMIT_DIR && pending.length) {
  mkdirSync(EMIT_DIR, { recursive: true });
  const CH = 55;
  for (let i = 0; i < Math.ceil(pending.length / CH); i++) {
    const ids = pending.slice(i * CH, (i + 1) * CH).map((x) => `'${x}'`).join(',');
    writeFileSync(
      join(EMIT_DIR, `pend-${String(i).padStart(2, '0')}.sql`),
      `UPDATE practice.qb_questions SET review_status='rejected', publication_policy = COALESCE(publication_policy,'{}'::jsonb) || '{"practiceEligible":false,"examEligible":false,"mockEligible":false,"commercialReleaseEligible":false}'::jsonb WHERE id IN (${ids}) AND review_status != 'rejected';\n`
    );
  }
  console.log(`\nwrote ${Math.ceil(pending.length / CH)} quarantine SQL chunks to ${EMIT_DIR}`);
}

process.exit(fail ? 1 : 0);
