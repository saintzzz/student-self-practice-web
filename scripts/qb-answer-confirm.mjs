#!/usr/bin/env node
/**
 * Second-pass adjudication for items flagged by qb-answer-verify.mjs.
 * Re-verifies each flagged question with a stricter prompt; only items
 * confirmed wrong by BOTH passes get flagged. Writes
 * docs/qa/answer-verify-confirmed.md.
 *
 * Usage: node scripts/qb-answer-confirm.mjs [--apply]
 *
 * Env: GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY (provider chain,
 * 429 falls through to the next configured provider), AI_MODEL,
 * ANTHROPIC_MODEL, OPENAI_MODEL, AI_PROVIDER to pin one provider.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QA = join(ROOT, 'docs', 'qa');
const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const MODEL = process.env.AI_MODEL || 'gemini-3.5-flash-lite';
const APPLY = process.argv.includes('--apply');
const GEMINI_KEY = process.env.GEMINI_API_KEY;

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  return JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8')).keys.service_role;
}
const KEY = serviceKey();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Accept-Profile': 'practice', 'Content-Profile': 'practice' };

const flagged = new Map();
for (const l of readFileSync(join(QA, '.answer-verify-cache.jsonl'), 'utf8').split('\n').filter(Boolean)) {
  try { const v = JSON.parse(l); if (!v.ok || !v.expl_ok) flagged.set(v.id, v); } catch {}
}
console.log(`flagged items to confirm: ${flagged.size}`);

async function fetchQ(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?select=id,grade,subject,question_type,prompt_text,transcript,passage,choices,answer,explanation_vi,publication_policy&id=in.(${ids.slice(i, i + 200).join(',')})`, { headers: H });
    if (!res.ok) throw new Error(await res.text());
    out.push(...await res.json());
  }
  return out;
}

const choiceLabel = (c) => typeof c === 'string' || typeof c === 'number' ? String(c)
  : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');

const ids = [...flagged.keys()];
const questions = await fetchQ(ids);
const byId = new Map(questions.map((q) => [q.id, q]));

const CONFIRM_PROMPT = (items) =>
  `You are a careful adjudicator. A first audit pass flagged these questions as possibly having a wrong marked answer or wrong explanation. Re-verify EACH independently and ONLY confirm real defects - the first pass often second-guesses correct arithmetic. Compute everything twice before confirming.\n` +
  `Return ONLY JSON: [{"id":"...","confirmed_wrong_answer":false,"confirmed_bad_expl":false,"note":""}]\n` +
  `confirmed_wrong_answer=true ONLY if marked_correct is definitely incorrect. confirmed_bad_expl=true ONLY if the explanation teaches something factually wrong (not merely brief).\n\n` +
  JSON.stringify(items);

class QuotaError extends Error {}

async function callGemini(items) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: CONFIRM_PROMPT(items) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (res.status === 429 || res.status === 503) throw new QuotaError(`gemini ${res.status}`);
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
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
      max_tokens: 8192, temperature: 0,
      messages: [{ role: 'user', content: CONFIRM_PROMPT(items) }],
    }),
  });
  if (res.status === 429 || res.status === 529) throw new QuotaError(`anthropic ${res.status}`);
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  return (await res.json()).content?.map((b) => b.text).join('') ?? '[]';
}

async function callOpenAI(items) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return JSON only, wrapped as {"verdicts":[...]}.' },
        { role: 'user', content: CONFIRM_PROMPT(items) },
      ],
    }),
  });
  if (res.status === 429 || res.status === 503) throw new QuotaError(`openai ${res.status}`);
  if (!res.ok) throw new Error(`openai ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content ?? '[]';
}

const QUOTA_COOLDOWN_MS = 15 * 60 * 1000;
const PIN = process.env.AI_PROVIDER;
let providers = [
  { name: 'gemini', key: GEMINI_KEY, call: callGemini },
  { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY, call: callAnthropic },
  { name: 'openai', key: process.env.OPENAI_API_KEY, call: callOpenAI },
].filter((p) => p.key && (!PIN || p.name === PIN));
const providerState = new Map(providers.map((p) => [p.name, { cooldownUntil: 0 }]));

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  const o = text.match(/\{[\s\S]*\}/);
  if (o) {
    try {
      const p = JSON.parse(o[0]);
      return Array.isArray(p) ? p : (p.verdicts ?? p.items ?? p);
    } catch {}
  }
  throw new Error('malformed JSON from model');
}

async function llm(items, attempt = 0) {
  if (!providers.length) throw new QuotaError('no AI provider key configured');
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
      if (e.message?.startsWith('malformed') && attempt < 3) {
        await new Promise((r) => setTimeout(r, 4000));
        return llm(items, attempt + 1);
      }
      console.log(`  ${p.name} error: ${e.message?.slice(0, 100)} - trying next`);
    }
  }
  if (attempt < 2) {
    await new Promise((r) => setTimeout(r, 15000));
    return llm(items, attempt + 1);
  }
  throw new QuotaError('all providers unavailable/quota-exhausted');
}

const items = questions.map((q) => {
  const a = q.answer ?? {};
  const it = { id: q.id, type: q.question_type, grade: q.grade, subject: q.subject, prompt: q.prompt_text, prior_flag: flagged.get(q.id)?.note ?? '' };
  if (q.passage) it.passage = q.passage;
  if (q.transcript) it.transcript = q.transcript;
  if (Array.isArray(q.choices)) { it.choices = q.choices.map(choiceLabel); if (a.index !== undefined) it.marked_correct = it.choices[a.index]; }
  if (a.text !== undefined) it.marked_correct = String(a.text);
  if (a.boolean !== undefined) it.marked_correct = String(a.boolean);
  it.explanation = q.explanation_vi;
  return it;
});

const confirmed = [];
for (let i = 0; i < items.length; i += 10) {
  const chunk = items.slice(i, i + 10);
  try {
    const out = await llm(chunk);
    for (const v of out) {
      const rec = { ...v, prior: flagged.get(v.id) };
      if (v.confirmed_wrong_answer || v.confirmed_bad_expl) confirmed.push(rec);
      console.log(`${v.id}: wrong=${!!v.confirmed_wrong_answer} bad_expl=${!!v.confirmed_bad_expl} ${v.note ?? ''}`);
    }
  } catch (e) { console.log(`batch failed: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 4000));
}

const lines = [
  `# Confirmed content defects (two-pass adjudicated)`,
  `Generated: ${new Date().toISOString()} | flagged: ${flagged.size} | confirmed: ${confirmed.length}`,
  ``,
  ...confirmed.map((v) => `- \`${v.id}\` wrong_answer=${!!v.confirmed_wrong_answer} bad_expl=${!!v.confirmed_bad_expl} - ${v.note}`),
];
writeFileSync(join(QA, 'answer-verify-confirmed.md'), lines.join('\n'));
console.log(`\nconfirmed: ${confirmed.length}`);

if (APPLY) {
  for (const v of confirmed.filter((c) => c.confirmed_wrong_answer)) {
    const q = byId.get(v.id);
    const policy = { ...(q.publication_policy ?? {}), practiceEligible: false, examEligible: false, mockEligible: false };
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${v.id}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ publication_policy: policy, review_status: 'flagged' }),
    });
    console.log(`flag ${v.id}: ${res.status}`);
  }
}
