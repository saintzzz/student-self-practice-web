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
 * Provider chain (first configured key wins; 429/quota falls back to the
 * next provider instead of retrying forever):
 *   GEMINI_API_KEY    + AI_MODEL          (default gemini-3.5-flash-lite)
 *   ANTHROPIC_API_KEY + ANTHROPIC_MODEL   (default claude-haiku-4-5-20251001)
 *   OPENAI_API_KEY    + OPENAI_MODEL      (default gpt-4o-mini)
 *   AI_PROVIDER can pin a single provider (gemini|anthropic|openai).
 *   BATCH_DELAY_MS (default 3500), SUPABASE_SERVICE_KEY for --apply.
 *   When NO direct provider key exists, seed remaining items into
 *   practice.qb_verify_todo for SWE-2/Devin session workers instead
 *   (see qb-answer-confirm.mjs / docs/qa/answer-verify.md).
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

const VERIFY_PROMPT = (items) =>
  `You are auditing a Vietnamese primary-school practice question bank (English, Math-in-English, Science-in-English).\n` +
  `For EACH item decide:\n` +
  `- "answer_ok": is marked_correct actually the correct answer given prompt/choices/passage/transcript? Check facts, arithmetic, grammar, spelling.\n` +
  `- "expl_ok": does the explanation justify WHY marked_correct is right (teaching value for a child)? Thin but correct still counts as ok=false only if it teaches nothing or is wrong.\n` +
  `Return ONLY a JSON array, one object per item, preserving id:\n` +
  `[{"id":"...","answer_ok":true,"expl_ok":true,"note":""}]\n` +
  `Set note (short, English) only when something is wrong. If unsure, answer_ok=true.\n\n` +
  JSON.stringify(items);

class QuotaError extends Error {}

async function callGemini(items) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: VERIFY_PROMPT(items) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });
  if (res.status === 429 || res.status === 503) throw new QuotaError(`gemini ${res.status}`);
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callAnthropic(items) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [{ role: 'user', content: VERIFY_PROMPT(items) }],
    }),
  });
  if (res.status === 429 || res.status === 529) throw new QuotaError(`anthropic ${res.status}`);
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.content?.map((b) => b.text).join('') ?? '';
}

async function callOpenAI(items) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return JSON only, wrapped as {"verdicts":[...]}.' },
        { role: 'user', content: VERIFY_PROMPT(items) },
      ],
    }),
  });
  if (res.status === 429 || res.status === 503) throw new QuotaError(`openai ${res.status}`);
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Provider chain: gemini -> anthropic -> openai. A provider returning
// 429/quota cools down for QUOTA_COOLDOWN_MS so later batches skip straight
// to the next configured provider instead of retrying a dead quota.
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000;
const ALL_PROVIDERS = [
  { name: 'gemini', key: GEMINI_KEY, call: callGemini },
  { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY, call: callAnthropic },
  { name: 'openai', key: process.env.OPENAI_API_KEY, call: callOpenAI },
];
const PIN = process.env.AI_PROVIDER;
let providers = ALL_PROVIDERS.filter((p) => p.key && (!PIN || p.name === PIN));
if (!providers.length && !PIN) providers = ALL_PROVIDERS.filter((p) => p.key);
const providerState = new Map(providers.map((p) => [p.name, { cooldownUntil: 0, failures: 0 }]));

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      const o = JSON.parse(obj[0]);
      if (Array.isArray(o)) return o;
      return o.verdicts ?? o.items ?? o;
    } catch {}
  }
  throw new Error('malformed JSON from model');
}

async function llm(items, attempt = 0) {
  if (!providers.length) {
    throw new QuotaError('no AI provider key configured - use qb_verify_todo/SWE-2 fallback');
  }
  const now = Date.now();
  for (const p of providers) {
    const st = providerState.get(p.name);
    if (st.cooldownUntil > now) continue;
    try {
      return extractJson(await p.call(items));
    } catch (e) {
      if (e instanceof QuotaError) {
        st.cooldownUntil = now + QUOTA_COOLDOWN_MS;
        console.log(`  ${p.name} quota - cooling down 15min, trying next provider`);
        continue;
      }
      if (e.message?.startsWith('malformed')) {
        if (attempt < 3) {
          console.log('  malformed JSON - retrying batch');
          await new Promise((r) => setTimeout(r, 4000));
          return llm(items, attempt + 1);
        }
        throw e;
      }
      // non-quota provider error: try next provider too
      console.log(`  ${p.name} error: ${e.message?.slice(0, 100)} - trying next`);
    }
  }
  // all providers exhausted: one retry pass for transient errors
  if (attempt < 2) {
    await new Promise((r) => setTimeout(r, 15000));
    return llm(items, attempt + 1);
  }
  throw new QuotaError('all providers unavailable/quota-exhausted');
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
