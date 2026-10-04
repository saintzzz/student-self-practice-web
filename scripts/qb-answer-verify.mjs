#!/usr/bin/env node
/**
 * LLM answer-correctness verification for the V6 question bank.
 *
 * Structural checks (qb-content-audit.mjs) prove a question is well-formed;
 * this pass asks an LLM whether the MARKED answer is actually correct and
 * whether the explanation supports it. Results land in
 * docs/qa/answer-verify.md; --apply also sets review_status='flagged' and
 * removes the item from all serving pools pending human review.
 *
 * Resume: verdicts are cached in docs/qa/.answer-verify-cache.jsonl keyed by
 * id + content hash, so re-runs only process unverdicted questions.
 *
 * Usage:
 *   node scripts/qb-answer-verify.mjs            # verify all, write report
 *   node scripts/qb-answer-verify.mjs --limit 60 # smoke run
 *   node scripts/qb-answer-verify.mjs --apply    # flag wrong answers in DB
 *
 * Env: GEMINI_API_KEY (required), AI_MODEL (default gemini-3.5-flash-lite),
 *      BATCH_DELAY_MS (default 3500), SUPABASE_SERVICE_KEY for --apply.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QA_DIR = join(ROOT, 'docs', 'qa');
const CACHE = join(QA_DIR, '.answer-verify-cache.jsonl');
const REPORT = join(QA_DIR, 'answer-verify.md');
const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const MODEL = process.env.AI_MODEL || 'gemini-3.5-flash-lite';
const DELAY = Number(process.env.BATCH_DELAY_MS || 3500);
const APPLY = process.argv.includes('--apply');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error('GEMINI_API_KEY required'); process.exit(1); }

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  const p = join(homedir(), '.config/devin/secrets/supabase_new_keys.json');
  return JSON.parse(readFileSync(p, 'utf8')).keys.service_role;
}
const SKEY = serviceKey();
const DB_HEADERS = {
  apikey: SKEY, Authorization: `Bearer ${SKEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
};

async function fetchAll(table, cols) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${cols}&offset=${off}&limit=1000`,
      { headers: DB_HEADERS });
    if (!res.ok) throw new Error(`${table}: ${res.status}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number'
    ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');

function describe(q) {
  const a = q.answer ?? {};
  const item = { id: q.id, type: q.question_type, grade: q.grade, subject: q.subject, prompt: q.prompt_text };
  if (q.passage) item.passage = q.passage;
  if (q.transcript) item.transcript = q.transcript;
  if (Array.isArray(q.choices)) {
    item.choices = q.choices.map(choiceLabel);
    if (a.index !== undefined) item.marked_correct = item.choices[a.index];
  }
  if (a.text !== undefined) item.marked_correct = String(a.text);
  if (a.boolean !== undefined) item.marked_correct = String(a.boolean);
  if (Array.isArray(a.sequence)) item.marked_correct = a.sequence.join(' ');
  item.explanation = q.explanation_vi;
  return item;
}

const hash = (q) => createHash('sha1')
  .update(JSON.stringify([q.prompt_text, q.choices, q.answer, q.passage, q.transcript]))
  .digest('hex').slice(0, 12);

async function llm(items, attempt = 0) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text:
              `You are auditing a Vietnamese primary-school practice question bank (English, Math-in-English, Science-in-English).\n` +
              `For EACH item decide:\n` +
              `- "answer_ok": is marked_correct actually the correct answer given prompt/choices/passage/transcript? Check facts, arithmetic, grammar, spelling.\n` +
              `- "expl_ok": does the explanation justify WHY marked_correct is right (teaching value for a child)? Thin but correct still counts as ok=false only if it teaches nothing or is wrong.\n` +
              `Return ONLY a JSON array, one object per item, preserving id:\n` +
              `[{"id":"...","answer_ok":true,"expl_ok":true,"note":""}]\n` +
              `Set note (short, English) only when something is wrong. If unsure, answer_ok=true.\n\n` +
              JSON.stringify(items),
          }],
        }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });
  if (!res.ok) {
    const t = await res.text();
    if ((res.status === 429 || res.status === 503) && attempt < 6) {
      const wait = Math.min(60000, 8000 * 2 ** attempt);
      console.log(`  ${res.status} - retry in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      return llm(items, attempt + 1);
    }
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    return JSON.parse(text);
  } catch (e) {
    if (attempt < 3) {
      console.log('  malformed JSON - retrying batch');
      await new Promise((r) => setTimeout(r, 4000));
      return llm(items, attempt + 1);
    }
    throw e;
  }
}

const questions = (await fetchAll('qb_questions',
  'id,grade,subject,question_type,prompt_text,transcript,passage,choices,answer,explanation_vi,publication_policy'))
  .filter((q) => q.publication_policy?.practiceEligible || q.publication_policy?.examEligible || q.publication_policy?.mockEligible);

mkdirSync(QA_DIR, { recursive: true });
const cache = new Map();
if (existsSync(CACHE)) {
  for (const line of readFileSync(CACHE, 'utf8').split('\n').filter(Boolean)) {
    try { const v = JSON.parse(line); cache.set(`${v.id}:${v.h}`, v); } catch {}
  }
}

const todo = questions.filter((q) => !cache.has(`${q.id}:${hash(q)}`)).slice(0, LIMIT);
console.log(`eligible: ${questions.length}, cached verdicts: ${cache.size}, to verify: ${todo.length}`);

const BATCH = 20;
let done = 0, failed = 0;
const verdicts = [];
for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  try {
    const out = await llm(chunk.map(describe));
    const byId = new Map(out.map((v) => [v.id, v]));
    for (const q of chunk) {
      const v = byId.get(q.id);
      if (!v) { failed++; continue; }
      const rec = { id: q.id, h: hash(q), ok: !!v.answer_ok, expl_ok: v.expl_ok !== false, note: v.note ?? '' };
      cache.set(`${rec.id}:${rec.h}`, rec);
      verdicts.push(rec);
      appendFileSync(CACHE, JSON.stringify(rec) + '\n');
    }
    done += chunk.length;
  } catch (e) {
    console.log(`batch ${i / BATCH} failed: ${e.message?.slice(0, 140)}`);
    failed += chunk.length;
  }
  process.stdout.write(`\rverified ${done + failed}/${todo.length}`);
  await new Promise((r) => setTimeout(r, DELAY));
}
console.log('');

const all = [...cache.values()].filter((v) => questions.some((q) => q.id === v.id && hash(q) === v.h));
const bad = all.filter((v) => !v.ok);
const weakExpl = all.filter((v) => v.ok && !v.expl_ok);
console.log(`\nverdicts: ${all.length} | wrong-answer: ${bad.length} | weak-explanation: ${weakExpl.length} | failed batches: ${failed}`);

const qById = new Map(questions.map((q) => [q.id, q]));
const lines = [
  `# Answer-correctness verification (LLM audit)`,
  `Generated: ${new Date().toISOString()}`,
  `model: ${MODEL} | verified: ${all.length}/${questions.length} eligible`,
  ``,
  `## Wrong answers (${bad.length})`,
  ...bad.slice(0, 200).map((v) => {
    const q = qById.get(v.id);
    return `- \`${v.id}\` - ${q?.prompt_text?.slice(0, 80)} | marked: ${describe(q ?? {}).marked_correct} | ${v.note}`;
  }),
  ``,
  `## Weak explanations (${weakExpl.length})`,
  ...weakExpl.slice(0, 200).map((v) => `- \`${v.id}\` - ${v.note}`),
];
writeFileSync(REPORT, lines.join('\n'));
console.log(`report: ${REPORT}`);

if (APPLY && bad.length) {
  for (const v of bad) {
    const q = qById.get(v.id);
    const policy = { ...(q.publication_policy ?? {}), practiceEligible: false, examEligible: false, mockEligible: false };
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${v.id}`, {
      method: 'PATCH', headers: { ...DB_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ publication_policy: policy, review_status: 'flagged' }),
    });
    if (!res.ok) console.log(`flag ${v.id}: ${res.status}`);
  }
  console.log(`flagged ${bad.length} questions (practiceEligible/examEligible/mockEligible=false, review_status=flagged)`);
}
