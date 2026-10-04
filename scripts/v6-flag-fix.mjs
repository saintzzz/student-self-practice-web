#!/usr/bin/env node
// CR-51 F5: normalize accented/exotic names + exclude non-sovereign
// territory flags from the practice pool.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const KEY = JSON.parse(
  readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'),
).keys.service_role;
const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice',
  'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};

// Accent -> standard English form taught to VN primary students.
const RENAME = new Map([
  ['piñata', 'pinata'],
  ['Piñata', 'Pinata'],
  ['Åland', 'Aland'],
  ['Curaçao', 'Curacao'],
  ['Réunion', 'Reunion'],
  ['Saint Barthélemy', 'Saint Barthelemy'],
  ['São Tomé and Príncipe', 'Sao Tome and Principe'],
  ['Türkiye', 'Turkey'],
]);

// Non-sovereign territories / unofficial flags - bad as the CORRECT
// answer for primary students (kept ok as distractors only if a row
// survives, but these rows get excluded when they are the answer or
// the prompted term).
const TERRITORIES = [
  'Aland', 'American Samoa', 'Anguilla', 'Antarctica', 'Aruba', 'Bermuda',
  'Christmas Island', 'Curacao', 'French Guiana', 'French Polynesia',
  'Gibraltar', 'Greenland', 'Guadeloupe', 'Guam', 'Guernsey', 'Hong Kong',
  'Jersey', 'Kosovo', 'Macau', 'Martinique', 'Mayotte', 'Montserrat',
  'New Caledonia', 'Niue', 'Norfolk Island', 'Palestine', 'Puerto Rico',
  'Reunion', 'Saint Barthelemy', 'Saint Helena', 'Saint Martin',
  'Saint Pierre and Miquelon', 'Sint Maarten', 'South Georgia', 'Taiwan',
  'Tokelau', 'Wallis and Futuna', 'Western Sahara', 'the Faroe Islands',
  'Faroe Islands', 'the Isle of Man', 'Isle of Man', 'the Falkland Islands',
  'Falkland Islands', 'the Cayman Islands', 'Cayman Islands',
  'the Cook Islands', 'Cook Islands', 'British Virgin Islands',
  'US Virgin Islands', 'Northern Mariana Islands', 'Pitcairn',
];

const normalize = (s) => {
  let t = s;
  for (const [a, b] of RENAME) t = t.split(a).join(b);
  return t;
};

const isTerritory = (s) => TERRITORIES.includes(normalize(s).trim());

const choiceLabel = (c) =>
  typeof c === 'string'
    ? c
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');

async function fetchAll() {
  const out = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/qb_questions?select=id,prompt_text,choices,answer,explanation_vi,learning_objective,question_type,publication_policy&offset=${off}&limit=${PAGE}`,
      { headers: HEADERS },
    );
    if (!res.ok) throw new Error(`fetch: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

async function patch(id, fields) {
  const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

const rows = await fetchAll();
console.log(`rows: ${rows.length}`);

let renamed = 0, excluded = 0, failed = 0;
const excludedList = [];

for (const q of rows) {
  const fields = {};

  // 1) correct-answer territory check
  let correctLabel = '';
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) {
    correctLabel = choiceLabel(q.choices[a.index]);
  }
  const promptTerm = (q.prompt_text ?? '').match(/Which picture shows: (.+)\?/)?.[1]
    ?? (q.prompt_text ?? '').match(/The picture shows [“"](.+?)[”"]\./)?.[1];

  const badAnswer = isTerritory(correctLabel) || (promptTerm && isTerritory(promptTerm));
  if (badAnswer && q.publication_policy?.practiceEligible) {
    fields.publication_policy = { ...q.publication_policy, practiceEligible: false, examEligible: false, mockEligible: false };
    excludedList.push(`${q.id} :: ${promptTerm || correctLabel}`);
  }

  // 2) accent normalization (only when the text actually changes)
  if (typeof q.prompt_text === 'string' && normalize(q.prompt_text) !== q.prompt_text) {
    fields.prompt_text = normalize(q.prompt_text);
  }
  if (typeof q.explanation_vi === 'string' && normalize(q.explanation_vi) !== q.explanation_vi) {
    fields.explanation_vi = normalize(q.explanation_vi);
  }
  if (typeof q.learning_objective === 'string' && normalize(q.learning_objective) !== q.learning_objective) {
    fields.learning_objective = normalize(q.learning_objective);
  }
  if (Array.isArray(q.choices)) {
    const nc = q.choices.map((c) => (typeof c === 'string' ? normalize(c) : c));
    if (JSON.stringify(nc) !== JSON.stringify(q.choices)) fields.choices = nc;
  }

  if (!Object.keys(fields).length) continue;
  if (fields.prompt_text || fields.explanation_vi || fields.choices || fields.learning_objective) renamed++;
  try {
    await patch(q.id, fields);
    if (badAnswer) excluded++;
  } catch (e) {
    failed++;
    console.error(String(e).slice(0, 200));
  }
}

console.log(`renamed=${renamed} excluded=${excluded} failed=${failed}`);
console.log('--- excluded correct-answer territories ---');
excludedList.forEach((x) => console.log(' ', x));
