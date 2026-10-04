#!/usr/bin/env node
/**
 * CR-59 - emit SQL for the authored advanced bank (scripts/gen-adv/items-*.mjs).
 * Validates every item shape, then writes supabase-adv/insert.sql.
 *
 *   node scripts/gen-advanced-bank.mjs          # validate + write SQL
 *   node scripts/gen-advanced-bank.mjs --check  # validate only, summary
 */
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS as MATH } from './gen-adv/items-math.mjs';
import { ITEMS as SCIENCE } from './gen-adv/items-science.mjs';
import { ITEMS as ENGLISH } from './gen-adv/items-english.mjs';

const SUBJECTS = { english: ENGLISH, math: MATH, science: SCIENCE };
const errors = [];
const rows = [];

const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
const j = (v) => esc(JSON.stringify(v));

for (const [subject, items] of Object.entries(SUBJECTS)) {
  items.forEach((it, i) => {
    const tag = `${subject}#${i} (${it.q?.slice(0, 40)}...)`;
    if (!it.g || it.g < 1 || it.g > 5) errors.push(`${tag}: bad grade ${it.g}`);
    if (!it.tf && !it.ro && (!it.q || typeof it.q !== 'string')) errors.push(`${tag}: missing prompt`);
    if (!it.ex) errors.push(`${tag}: missing explanation_vi`);
    if (!it.lo) errors.push(`${tag}: missing learning_objective`);
    if (!it.skill || !it.dom || !it.top) errors.push(`${tag}: missing skill/domain/topic`);
    if (!it.d || it.d < 4 || it.d > 5) errors.push(`${tag}: difficulty must be 4-5, got ${it.d}`);

    let questionType = 'mcq';
    let choices = null, answer = null, passage = null, statement = null, tokens = null;

    if (it.tf) {
      questionType = 'true-false';
      if (!it.passage || !it.statement || it.bool === undefined) {
        errors.push(`${tag}: tf needs passage+statement+bool`);
      }
      passage = it.passage; statement = it.statement;
      choices = ['True', 'False'];
      answer = { boolean: it.bool };
    } else if (it.ro) {
      questionType = 'reorder';
      if (!Array.isArray(it.tokens) || it.tokens.length < 2 || !it.text) {
        errors.push(`${tag}: ro needs tokens[]>=2 + text`);
      }
      tokens = it.tokens; answer = { text: it.text };
    } else if (it.ta) {
      questionType = 'text-answer';
      if (!Array.isArray(it.accept) || !it.accept.length) errors.push(`${tag}: ta needs accept[]`);
      answer = { text: it.accept?.[0], accepted: it.accept };
    } else {
      if (!Array.isArray(it.c) || it.c.length !== 4) errors.push(`${tag}: mcq needs 4 choices`);
      if (typeof it.a !== 'number' || it.a < 0 || it.a > 3) errors.push(`${tag}: bad answer index ${it.a}`);
      choices = it.c;
      answer = { text: it.c?.[it.a], index: it.a };
      // same-text distractors make the item ambiguous
      if (it.c && new Set(it.c).size !== 4) errors.push(`${tag}: duplicate choices`);
    }

    const id = `g${it.g}-${subject}-adv-${createHash('sha1')
      .update(`${it.g}|${subject}|${it.q ?? it.statement}`)
      .digest('hex').slice(0, 12)}`;
    const contentHash = createHash('sha1')
      .update(JSON.stringify([it.q ?? it.statement, choices, answer, passage]))
      .digest('hex').slice(0, 16);

    rows.push({
      id, grade: it.g, subject, domain: it.dom, skill: it.skill,
      question_type: questionType, difficulty: it.d, topic_key: it.top,
      prompt_text: questionType === 'true-false' ? 'Read the passage. True or False?'
        : questionType === 'reorder' ? 'Rearrange the words to make a correct sentence.' : it.q,
      transcript: null, choices, answer,
      explanation_vi: it.ex, learning_objective: it.lo,
      curriculum_alignment: {
        grade: it.g, coreTopic: it.top, moetSubject: subject === 'english' ? 'English' : subject === 'math' ? 'Mathematics' : 'Science',
        alignmentLevel: 'topic-skill', curriculumRole: 'extension', primaryFramework: 'MOET-2018',
      },
      tags: null, canonical: true, variant_group_id: null,
      rights_status: 'owned-original-generated',
      review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
      publication_policy: {
        examEligible: false, mockEligible: true, practiceEligible: true,
        commercialReleaseEligible: true, requiresHumanApprovalForExam: true,
        requiresHumanApprovalForCommercialRelease: false,
      },
      content_hash: contentHash,
      source: { kind: 'generated-v6', method: 'cr59-authored-advanced', provenance: 'Hand-authored advanced item; original, not copied from a textbook or competition bank.' },
      schema_version: '6.0', passage, statement, tokens,
    });
  });
}

// duplicate id / content guard - prompts like "Read the passage. True or
// False?" or "Choose the correct sentence." repeat legitimately; what
// must be unique is the whole item (hash) and its id.
const ids = new Set(); const hashes = new Set();
for (const r of rows) {
  if (ids.has(r.id)) errors.push(`dup id ${r.id}`);
  if (hashes.has(r.content_hash)) errors.push(`dup content ${r.id} - ${r.prompt_text}`);
  ids.add(r.id); hashes.add(r.content_hash);
}

const counts = {};
for (const r of rows) counts[`${r.subject}-g${r.grade}`] = (counts[`${r.subject}-g${r.grade}`] ?? 0) + 1;
console.log('items per cell:', JSON.stringify(counts, null, 0));
console.log('total:', rows.length, '- errors:', errors.length);
for (const e of errors) console.log('  ERR', e);
if (errors.length) process.exit(1);
if (process.argv.includes('--check')) process.exit(0);

const cols = '(id, grade, subject, domain, skill, question_type, difficulty, topic_key, prompt_text, transcript, choices, answer, explanation_vi, learning_objective, curriculum_alignment, tags, canonical, variant_group_id, rights_status, review_status, publication_policy, content_hash, source, schema_version, passage, statement, tokens)';
const values = rows.map((r) => `(${esc(r.id)}, ${r.grade}, ${esc(r.subject)}, ${esc(r.domain)}, ${esc(r.skill)}, ${esc(r.question_type)}, ${r.difficulty}, ${esc(r.topic_key)}, ${esc(r.prompt_text)}, null, ${r.choices ? j(r.choices) : 'null'}, ${j(r.answer)}, ${esc(r.explanation_vi)}, ${esc(r.learning_objective)}, ${j(r.curriculum_alignment)}, null, true, null, 'owned-original-generated', 'machine-editorial-reviewed-human-academic-signoff-required', ${j(r.publication_policy)}, ${esc(r.content_hash)}, ${j(r.source)}, '6.0', ${r.passage ? esc(r.passage) : 'null'}, ${r.statement ? esc(r.statement) : 'null'}, ${r.tokens ? j(r.tokens) : 'null'})`);

const sql = `-- CR-59: authored advanced bank (${rows.length} items). Generated by scripts/gen-advanced-bank.mjs.
insert into practice.qb_questions ${cols}
values
${values.join(',\n')}
on conflict (id) do nothing;
`;
mkdirSync(join(dirname(fileURLToPath(import.meta.url)), 'gen-adv-out'), { recursive: true });
const out = join(dirname(fileURLToPath(import.meta.url)), 'gen-adv-out', 'insert-adv.sql');
writeFileSync(out, sql);
console.log('wrote', out, `(${(sql.length / 1024).toFixed(0)} KB)`);

// --push: send rows via PostgREST with the service key (upsert on id).
if (process.argv.includes('--push')) {
  const { readFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const SUPA = 'https://cxjpgfhqchjoernfmcra.supabase.co';
  const key = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8')).keys.service_role;
  const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Accept-Profile': 'practice', 'Content-Profile': 'practice',
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error('push failed:', res.status, await res.text());
    process.exit(1);
  }
  console.log('pushed', rows.length, 'rows');
}
