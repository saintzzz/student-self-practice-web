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

async function countRows(filter) {
  const r = await fetch(`${SUPA}/rest/v1/qb_questions?select=id&${filter}&limit=0`, { headers: H });
  const cr = r.headers.get('content-range') ?? '';
  return Number(cr.split('/')[1] ?? -1);
}

let failures = 0;
const check = (name, bad, detail = '') => {
  console.log(`${bad ? 'FAIL' : ' ok '} ${name}${detail ? ` - ${detail}` : ''}`);
  if (bad) failures++;
};

// 1. publication_policy drift
const drift = await countRows('publication_policy->requiresHumanApprovalForCommercialRelease=eq.false');
check('publication-policy flag=true everywhere', drift !== 0, `${drift} rows with false`);
const nullPolicy = await countRows('publication_policy=is.null');
check('publication_policy present on all rows', nullPolicy !== 0, `${nullPolicy} null rows`);

// 2. within-grade strict dupes: prompt + sorted choices + answer + statement.
// Same prompt+answer with a DIFFERENT choice set is a legit variant, not a dupe.
const seen = new Map();
let dupRows = 0;
for (let off = 0; ; off += 1000) {
  const r = await fetch(
    `${SUPA}/rest/v1/qb_questions?select=grade,subject,prompt_text,choices,answer,statement&order=id&offset=${off}&limit=1000`,
    { headers: H },
  );
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) break;
  for (const q of rows) {
    const k = `${q.grade}|${q.subject}|${q.prompt_text}|${JSON.stringify([...(q.choices ?? [])].sort())}|${JSON.stringify(q.answer)}|${q.statement ?? ''}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n > 1) dupRows++;
  }
  if (rows.length < 1000) break;
}
check('no within-grade exact dupes', dupRows !== 0, `${dupRows} duplicate rows`);

// 3. known-bad semantic patterns - fetch "smaller" questions and verify
// each answer is actually the smaller of the two numbers (r2 finding).
const r = await fetch(
  `${SUPA}/rest/v1/qb_questions?select=id,prompt_text,answer&prompt_text=like.*Which*number*smaller*&limit=200`,
  { headers: H },
);
const sq = (await r.json()) ?? [];
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
