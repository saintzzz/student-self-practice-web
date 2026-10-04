#!/usr/bin/env node
// CR-51 F6a: remove "option-N" placeholder choices, add 3rd listen
// distractor, rename ambiguous country labels.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const KEY = JSON.parse(
  readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'),
).keys.service_role;
const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};

async function fetchAll() {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/qb_questions?select=id,prompt_text,choices,answer,explanation_vi,learning_objective&offset=${off}&limit=1000`,
      { headers: HEADERS });
    if (!res.ok) throw new Error(await res.text());
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}
async function patch(id, fields) {
  const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

const rows = await fetchAll();
let nOpt = 0, nListen = 0, nName = 0, failed = 0;

/* --- 1. option-N placeholders: drop the fake choice, re-index answer --- */
for (const q of rows) {
  if (!Array.isArray(q.choices) || !q.choices.some((c) => typeof c === 'string' && /^option-\d+$/.test(c))) continue;
  const keep = q.choices.filter((c) => !(typeof c === 'string' && /^option-\d+$/.test(c)));
  if (keep.length < 3) { console.error(`SKIP ${q.id}: would leave ${keep.length}`); continue; }
  const idx = keep.findIndex((c) => String(c) === String(q.answer?.text));
  if (idx < 0) { console.error(`SKIP ${q.id}: answer not in choices`); continue; }
  try {
    await patch(q.id, { choices: keep, answer: { ...q.answer, index: idx } });
    nOpt++;
  } catch (e) { failed++; console.error(String(e).slice(0, 160)); }
}

/* --- 2. two-choice listen items: append a plausible 3rd sentence --- */
const DISTRACTORS = {
  'My pet is a dog.': 'My pet is a cat.',
  'We have Maths on Monday.': 'We have English on Tuesday.',
  'My house has a kitchen.': 'My house has a garden.',
};
for (const q of rows) {
  if (q.prompt_text !== 'Listen and choose the sentence you hear.' || !Array.isArray(q.choices) || q.choices.length !== 2) continue;
  const extra = DISTRACTORS[q.answer?.text];
  if (!extra || q.choices.includes(extra)) { console.error(`SKIP ${q.id}: no distractor for ${q.answer?.text}`); continue; }
  try {
    await patch(q.id, { choices: [...q.choices, extra] });
    nListen++;
  } catch (e) { failed++; console.error(String(e).slice(0, 160)); }
}

/* --- 3. ambiguous country names -> precise official names --- */
const RENAME = new Map([
  ['Bosnia', 'Bosnia and Herzegovina'],
  ['Congo', 'the Republic of the Congo'],
  ['Korea', 'South Korea'],
  ['America', 'the USA'],
]);
for (const q of rows) {
  const fields = {};
  if (Array.isArray(q.choices)) {
    const nc = q.choices.map((c) => (typeof c === 'string' && RENAME.has(c) ? RENAME.get(c) : c));
    if (JSON.stringify(nc) !== JSON.stringify(q.choices)) fields.choices = nc;
  }
  if (q.answer?.text && RENAME.has(String(q.answer.text))) {
    fields.answer = { ...q.answer, text: RENAME.get(String(q.answer.text)) };
  }
  for (const [from, to] of RENAME) {
    const p = `Which picture shows: ${from}?`;
    if (q.prompt_text === p) fields.prompt_text = `Which picture shows: ${to}?`;
    const t = `The picture shows “${from}”.`;
    if (q.prompt_text === t) fields.prompt_text = `The picture shows “${to}”.`;
  }
  if (typeof q.explanation_vi === 'string') {
    let ex = q.explanation_vi;
    for (const [from, to] of RENAME) ex = ex.split(from).join(to);
    if (ex !== q.explanation_vi) fields.explanation_vi = ex;
  }
  if (!Object.keys(fields).length) continue;
  try { await patch(q.id, fields); nName++; }
  catch (e) { failed++; console.error(String(e).slice(0, 160)); }
}

console.log(`option-placeholder removed=${nOpt} listen-3rd-distractor=${nListen} renamed=${nName} failed=${failed}`);
