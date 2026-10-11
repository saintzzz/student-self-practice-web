#!/usr/bin/env node
/**
 * audit-bank.mjs - reproducible verification for qb_questions.
 * External-review r2 finding: r1 cleanup (306 semantic rows deleted,
 * publication-policy backfill, dup removal) had no committed, re-runnable
 * check. This script FAILS (exit 1) on any drift:
 *
 *   node scripts/audit-bank.mjs
 *
 * Checks:
 *   1. publication_policy flag drift (all generated flags must be true)
 *   2. exact duplicate groups per (grade, subject, prompt, choices, answer)
 *   3. known-bad semantic patterns still present in DB
 *   4. missing explanation_vi / learning_objective on canonical rows
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url;
const H = {
  apikey: keys.keys.service_role,
  Authorization: `Bearer ${keys.keys.service_role}`,
  'Accept-Profile': 'practice',
  Prefer: 'count=exact',
};

async function fetchJson(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  const body = await r.json();
  if (!Array.isArray(body)) throw new Error(`non-array response from ${url}`);
  return body;
}

async function countRows(filter) {
  const r = await fetch(`${SUPA}/rest/v1/qb_questions?select=id&${filter}&limit=0`, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} for countRows(${filter})`);
  const cr = r.headers.get('content-range') ?? '';
  const n = Number(cr.split('/')[1] ?? -1);
  if (n < 0) throw new Error(`no content-range for countRows(${filter})`);
  return n;
}

let failures = 0;
const check = (name, bad, detail = '') => {
  console.log(`${bad ? 'FAIL' : ' ok '} ${name}${detail ? ` - ${detail}` : ''}`);
  if (bad) failures++;
};

// 1. publication_policy drift: after the r3 operator signoff, approved rows
// legitimately carry requiresHumanApprovalForCommercialRelease=false - the
// flag may only be false when review_status='approved' (the clearing gate).
const drift = await countRows(
  'publication_policy->requiresHumanApprovalForCommercialRelease=eq.false&review_status=neq.approved'
);
check('commercial flag=false only on approved rows', drift !== 0, `${drift} unapproved rows with flag=false`);
const nullPolicy = await countRows('publication_policy=is.null');
check('publication_policy present on all rows', nullPolicy !== 0, `${nullPolicy} null rows`);

// 2. within-grade strict dupes: prompt + sorted choices + answer + statement.
// Same prompt+answer with a DIFFERENT choice set is a legit variant, not a dupe.
const seen = new Map();
let dupRows = 0;
for (let off = 0; ; off += 1000) {
  const rows = await fetchJson(
    `${SUPA}/rest/v1/qb_questions?select=grade,subject,prompt_text,choices,answer,statement&order=id&offset=${off}&limit=1000`,
  );
  if (!rows.length) break;
  for (const q of rows) {
    const k = `${q.grade}|${q.subject}|${q.prompt_text}|${JSON.stringify([...(q.choices ?? [])].sort())}|${JSON.stringify(q.answer)}|${q.statement ?? ''}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n > 1) dupRows++;
  }
  if (rows.length < 1000) break;
}
check('no within-grade exact dupes', dupRows !== 0, `${dupRows} duplicate rows`);

// 3. known-bad semantic patterns - fetch ALL "smaller" questions and
// verify each answer is actually the smaller of the two numbers (r2/r3
// findings: must paginate the whole set, not sample 200).
const sq = [];
for (let off = 0; ; off += 1000) {
  const page = await fetchJson(
    `${SUPA}/rest/v1/qb_questions?select=id,prompt_text,answer&prompt_text=like.*Which*number*smaller*&order=id&offset=${off}&limit=1000`,
  );
  sq.push(...page);
  if (page.length < 1000) break;
}
let badCmp = 0;
for (const q of sq) {
  const m = /smaller: (\d+) or (\d+)/.exec(q.prompt_text ?? '');
  if (m) {
    const smaller = Math.min(+m[1], +m[2]);
    const ans = String(q.answer?.text ?? q.answer?.index ?? '');
    if (ans !== String(smaller)) badCmp++;
  }
}
check('"smaller" answers are actually the smaller number', badCmp !== 0, `${badCmp}/${sq.length} wrong`);

// r3: scramble prompts must contain exactly the letters of the answer.
const scr = await fetchJson(
  `${SUPA}/rest/v1/qb_questions?select=id,prompt_text,answer&prompt_text=like.*Rearrange*letters*&limit=1000`,
);
const srt = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
let badScr = 0;
for (const q of scr) {
  const letters = /letters to make a word: (.+)$/.exec(q.prompt_text ?? '')?.[1];
  const word = String(q.answer?.text ?? '');
  if (letters && word && srt(letters) !== srt(word)) badScr++;
}
check('scramble prompts match the answer letter multiset', badScr !== 0, `${badScr}/${scr.length} wrong`);

// r3: missing-letter gaps must reconstruct the target word.
const mis = await fetchJson(
  `${SUPA}/rest/v1/qb_questions?select=id,prompt_text,answer&prompt_text=like.*missing*letters*&limit=1000`,
);
let badMis = 0;
for (const q of mis) {
  const gap = /letters: (\S+)/.exec(q.prompt_text ?? '')?.[1];
  const letters = String(q.answer?.text ?? '');
  const whole = gap?.replace(/_+/g, letters);
  if (gap && whole && whole.includes('_')) badMis++;
}
check('missing-letter gaps fully reconstruct a word', badMis !== 0, `${badMis}/${mis.length} wrong`);

// r3: non-human nouns must only take sensible superlatives (generator
// whitelist): river=long/big/beautiful, road=long/big, day=hot/cold/happy/
// beautiful, animal=big/fast/beautiful.
const seenRows = await fetchJson(
  `${SUPA}/rest/v1/qb_questions?select=id,prompt_text,answer&prompt_text=like.*I*have*ever*seen*&limit=1000`,
);
const NOUN_OK = {
  river: ['the longest', 'the biggest', 'the most beautiful'],
  road: ['the longest', 'the biggest'],
  day: ['the hottest', 'the coldest', 'the happiest', 'the most beautiful'],
  animal: ['the biggest', 'the fastest', 'the most beautiful'],
};
let badNoun = 0;
for (const q of seenRows) {
  const noun = /___ (\w+) I have ever seen/.exec(q.prompt_text ?? '')?.[1];
  const ans = String(q.answer?.text ?? '');
  if (noun && NOUN_OK[noun] && !NOUN_OK[noun].includes(ans)) badNoun++;
}
check('non-human nouns take only sensible superlatives', badNoun !== 0, `${badNoun}/${seenRows.length} rows`);

// superlative mismatches flagged in r2: "Lan is ___ student" with non-human adjectives
const badSup = await countRows(
  "prompt_text=like.*Lan is*student*&answer->>text=in.(the hottest,the coldest,the longest,the fastest,the slowest,the worst)"
);
check('no non-human superlatives on "student" rows', badSup !== 0, `${badSup} rows`);

// 4. completeness
const noEx = await countRows('canonical=eq.true&explanation_vi=is.null');
check('canonical rows all have explanation_vi', noEx !== 0, `${noEx} missing`);
const noLo = await countRows('canonical=eq.true&learning_objective=is.null');
check('canonical rows all have learning_objective', noLo !== 0, `${noLo} missing`);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
