#!/usr/bin/env node
/**
 * CR-67 - push items drafted via ChatGPT web UI (no API key needed).
 * Reads a JSON array of items from a file, validates, dedupes, upserts.
 *
 *   node scripts/gen-chatgpt-push.mjs --subject math --grade 3 --file /tmp/batch.json
 *
 * Item schema is the same as gen-bulk-bank.mjs expects:
 *   mcq:  {q, c:[4], a, ex, lo, d}
 *   tf:   {tf:true, passage, statement, bool, ex, lo, d}
 *   ro:   {ro:true, tokens:[], text, ex, lo, d}
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const SUBJECT = arg('--subject', 'math');
const GRADE = Number(arg('--grade', 0));
const FILE = arg('--file');
const DRY = ARGS.includes('--dry');
if (!GRADE || !FILE) { console.error('need --grade N --file path'); process.exit(1); }

const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url;
const SVC = keys.keys.service_role;

const raw = JSON.parse(readFileSync(FILE, 'utf8'));
const items = Array.isArray(raw) ? raw : raw.items ?? [];

function validItem(it) {
  if (it.tf) return typeof it.passage === 'string' && it.passage.length > 10 && typeof it.statement === 'string' && typeof it.bool === 'boolean' && typeof it.ex === 'string' && it.ex.length > 5;
  if (it.ro) {
    if (!Array.isArray(it.tokens) || it.tokens.length < 3 || typeof it.text !== 'string' || typeof it.ex !== 'string') return false;
    const norm = (s) => s.toLowerCase().replace(/[.!?,;:'"]/g, '').replace(/\s+/g, ' ').trim();
    return norm(it.tokens.join(' ')) === norm(it.text);
  }
  if (it.ta || it.question_type === 'text-answer') {
    return typeof it.q === 'string' && it.q.length > 5 && typeof it.answer === 'string' && it.answer.length > 0 && typeof it.ex === 'string' && it.ex.length > 5;
  }
  return typeof it.q === 'string' && it.q.length > 5 &&
    Array.isArray(it.c) && it.c.length === 4 && new Set(it.c).size === 4 &&
    Number.isInteger(it.a) && it.a >= 0 && it.a <= 3 &&
    typeof it.ex === 'string' && it.ex.length > 5;
}

const DOMAINS = { english: 'vocabulary', math: 'numbers', science: 'science' };
const SKILLS = { english: 'vocabulary-in-context', math: 'arithmetic', science: 'concept' };

function toRow(it) {
  const isTa = !!(it.ta || it.question_type === 'text-answer');
  const questionType = it.tf ? 'true-false' : it.ro ? 'reorder' : isTa ? 'text-answer' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.ro ? 'Rearrange the words to make a correct sentence.' : it.q;
  const idKey = it.q ?? it.statement ?? it.text;
  const id = `g${GRADE}-${SUBJECT}-cgpt-${createHash('sha1').update(`${GRADE}|${SUBJECT}|${idKey}`).digest('hex').slice(0, 12)}`;
  const choices = it.ro ? null : it.tf ? ['True', 'False'] : isTa ? null : it.c;
  const answer = it.tf ? { boolean: it.bool } : it.ro ? { text: it.text } : isTa ? { text: it.answer } : { text: it.c[it.a], index: it.a };
  const contentHash = createHash('sha1').update(JSON.stringify([promptText, choices, answer, it.passage ?? null])).digest('hex').slice(0, 16);
  return {
    id, grade: GRADE, subject: SUBJECT,
    domain: it.tf ? 'reading' : it.ro ? 'writing' : (it.dom ?? DOMAINS[SUBJECT] ?? 'vocabulary'),
    skill: it.tf ? 'reading' : it.ro ? 'writing' : (it.skill ?? SKILLS[SUBJECT] ?? 'vocabulary-in-context'),
    question_type: questionType, difficulty: Math.min(5, Math.max(1, it.d ?? 2)),
    topic_key: String(it.top ?? 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    prompt_text: String(promptText).slice(0, 500), transcript: null,
    choices, answer,
    explanation_vi: String(it.ex).slice(0, 500), learning_objective: String(it.lo ?? '').slice(0, 200),
    curriculum_alignment: { grade: GRADE, coreTopic: it.top ?? 'general', moetSubject: SUBJECT, alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    tags: null, canonical: true, variant_group_id: null,
    rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
    content_hash: contentHash,
    source: { kind: 'generated-v6', method: 'cr67-chatgpt-web', provenance: 'AI-drafted via ChatGPT web; schema-validated; original, not copied.' },
    schema_version: '6.0', passage: it.passage ?? null, statement: it.statement ?? null, tokens: it.ro ? it.tokens : null,
  };
}

async function push(rows) {
  const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
    method: 'POST',
    headers: {
      apikey: SVC, Authorization: `Bearer ${SVC}`,
      'Accept-Profile': 'practice', 'Content-Profile': 'practice',
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) console.error('push fail', res.status, (await res.text()).slice(0, 200));
  return res.ok;
}

const seen = new Set();
const rows = [];
let bad = 0, dup = 0;
for (const it of items) {
  if (!validItem(it)) { bad++; continue; }
  const row = toRow(it);
  if (seen.has(row.id) || seen.has(row.content_hash)) { dup++; continue; }
  seen.add(row.id); seen.add(row.content_hash);
  rows.push(row);
}
console.log(`${SUBJECT} G${GRADE}: in=${items.length} valid=${rows.length} bad=${bad} dup=${dup}`);
if (!DRY && rows.length) {
  let ok = true;
  for (let c = 0; c < rows.length; c += 500) ok = (await push(rows.slice(c, c + 500))) && ok;
  console.log(ok ? `pushed ${rows.length}` : `PUSH FAILED ${rows.length}`);
  if (!ok) process.exit(2);
}
