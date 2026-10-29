// CR-109 shared GTM agent library: Supabase REST client on the `gtm`
// schema (service_role), provider-flexible LLM chatJson, dedupe /
// footer / suppression helpers shared by discover|enrich|draft|send.
//
// Env (never hardcode):
//   supabase service key: ~/.config/devin/secrets/supabase_new_keys.json
//   AI_PROVIDER/AI_MODEL overrides; GEMINI_API_KEY -> OPENAI_API_KEY ->
//   ANTHROPIC_API_KEY chain; rule fallbacks when no key.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Lazy: unit tests + machines without the secrets file must still be
// able to import the pure helpers (normText/dedupeKey/hasFooter).
let _keys = null;
function keys() {
  if (!_keys) {
    _keys = JSON.parse(
      readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'),
    );
  }
  return _keys;
}
// Env overrides win over the secrets file so tests/CI can exercise the
// REST helpers without a credentials file on disk (r145 BLOCKER-1:
// keys() threw ENOENT before the stubbed fetch was reached).
export const URL_ = () => process.env.GTM_SUPABASE_URL ?? keys().url;
export const SVC = () => process.env.GTM_SERVICE_ROLE_KEY ?? keys().keys.service_role;
export const H = () => ({
  apikey: SVC(),
  Authorization: `Bearer ${SVC()}`,
  'Accept-Profile': 'gtm',
  'Content-Profile': 'gtm',
  'Content-Type': 'application/json',
});

export async function gtmGet(table, qs = '') {
  const res = await fetch(`${URL_()}/rest/v1/${table}${qs ? `?${qs}` : ''}`, { headers: H() });
  if (!res.ok) throw new Error(`gtmGet ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function gtmUpsert(table, rows, onConflict) {
  const res = await fetch(`${URL_()}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...H(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`gtmUpsert ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function gtmPatch(table, qs, patch, prefer = 'return=representation') {
  const res = await fetch(`${URL_()}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: { ...H(), Prefer: prefer },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`gtmPatch ${table}: ${res.status} ${await res.text()}`);
  return res.headers.get('content-type')?.includes('json') ? res.json() : null;
}

export async function gtmPost(table, rows) {
  const res = await fetch(`${URL_()}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H(), Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`gtmPost ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Keyset-paginated read for tables that can exceed the ~1000 row cap
// (bounded-reads convention). Pagination is only correct on a UNIQUE,
// non-null column - anything else (created_at ties, fit.desc) returns a
// single bounded page, never an incorrect concatenation.
export async function gtmAll(table, select, filters = '', order = 'id') {
  const [col, dir = 'asc'] = order.split('.');
  const pageable = dir === 'asc' && col === 'id';
  const out = [];
  let last = '';
  for (;;) {
    const q = `select=${select}&order=${order}&limit=1000${last ? `&${col}=gt.${encodeURIComponent(last)}` : ''}${filters ? `&${filters}` : ''}`;
    const page = await gtmGet(table, q);
    if (!page.length) return out;
    out.push(...page);
    if (page.length < 1000 || !pageable) return out;
    last = page[page.length - 1][col];
  }
}

// Exact row count via PostgREST count=exact (daily-cap arithmetic must
// never trust a paginated client count).
export async function gtmCount(table, filters = '') {
  const res = await fetch(`${URL_()}/rest/v1/${table}?${filters}`, {
    method: 'HEAD',
    headers: { ...H(), Prefer: 'count=exact' },
  });
  if (!res.ok) throw new Error(`gtmCount ${table}: ${res.status}`);
  const range = res.headers.get('content-range') ?? '';
  const n = Number(range.split('/')[1]);
  return Number.isFinite(n) ? n : 0;
}

// PostgREST filter values come from CLI args - a malformed value can
// break out of `col=eq.<v>` into a second filter. UUID-gate the only
// shape callers pass today.
export function uuidOrThrow(v, name = 'value') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v ?? '')) {
    throw new Error(`${name} must be a uuid, got: ${v}`);
  }
  return v;
}

export async function recordRun(agent, stats, { llmCalls = 0, cost = null, ms = 0, errors = null, campaignId = null } = {}) {
  await gtmPost('runs', [{
    agent,
    campaign_id: campaignId,
    stats,
    llm_calls: llmCalls,
    cost_estimate: cost,
    duration_ms: Math.round(ms),
    errors,
  }]).catch((e) => console.error(`runs row failed: ${e.message}`));
}

// ---------------- normalization / dedupe (REQ-1.2) ------------------

export function normText(s) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normPhone(s) {
  const digits = (s ?? '').replace(/\D/g, '');
  if (!digits) return '';
  // VN numbers: normalize +84 / 84 prefix to local 0-format.
  if (digits.startsWith('84') && digits.length >= 10) return `0${digits.slice(2)}`;
  return digits;
}

export function dedupeKey({ name, city, phone }) {
  const p = normPhone(phone);
  if (p) return `p:${p}`;
  return `n:${normText(name)}|${normText(city)}`;
}

// Business-email hygiene (REQ-1.3): reject personal-name mailboxes on
// consumer providers; org-domain mailboxes always pass.
const CONSUMER_HOSTS = new Set(['gmail.com', 'yahoo.com', 'yahoo.com.vn', 'hotmail.com', 'outlook.com', 'icloud.com']);
const PERSONALISH = /^[a-z]+(\.[a-z]+)+[0-9]*$/;
export function isBusinessEmail(email, orgDomain) {
  const host = (email.split('@')[1] ?? '').toLowerCase();
  if (!host) return false;
  if (orgDomain && host === orgDomain) return true;
  if (!CONSUMER_HOSTS.has(host)) return true;
  const local = email.split('@')[0].toLowerCase();
  return !PERSONALISH.test(local) || /info|contact|admin|office|hello|sales|center|truong|school/.test(local);
}

// ---------------- enrich prefilter (REQ-2.1) ------------------------
// Conservative: only CLEAR non-targets drop - edge cases go to the LLM
// scorer (a university running kids' classes still gets scored; a
// restaurant never should).
const DROP_PATTERNS = [
  /\b(nha hang|khach san|quan|cafe|coffee|restaurant|hotel|resort|spa|phong kham|benh vien|sieu thi|shop|cua hang|garage|salon|karaoke)\b/,
  /\b(dai hoc|university|cao dang|college|vien|institute of|trung tam nghien cuu|so giao duc|phong giao duc|ban quan ly|cong an|cong ty|tap doan)\b/,
];
const KEEP_PATTERNS = [
  /\b(tieu hoc|primary|elementary|tre em|kids|children|mam non|kindergarten|truong|school|academy|anh ngu|tieng anh|english|ielts|giao duc|education|cambridge)\b/,
];

export function prefilter(lead) {
  const text = normText(
    `${lead.name} ${lead.source ?? ''} ${lead.address ?? ''} ${lead.signals?.category ?? ''}`,
  );
  const hasKeep = KEEP_PATTERNS.some((p) => p.test(text));
  if (!hasKeep) return 'no_education_signal';
  const hardDrop = /\b(dai hoc|university|cao dang|so giao duc|phong giao duc|ban quan ly|cong an)\b/;
  if (DROP_PATTERNS.some((p) => p.test(text)) && hardDrop.test(text)) {
    return 'tertiary_or_government';
  }
  return null;
}

// ---------------- footer sentinel (REQ-3.5) -------------------------

export const FOOTER_SENTINEL = 'VieSchool - nền tảng luyện tiếng Anh tiểu học';
export const FOOTER_OPTOUT = 'trả lời "KHÔNG"';
export function hasFooter(body) {
  return (body ?? '').includes(FOOTER_SENTINEL) && (body ?? '').includes(FOOTER_OPTOUT);
}

export function buildFooter() {
  const name = process.env.GTM_SENDER_NAME ?? 'VieSchool Team';
  const role = process.env.GTM_SENDER_ROLE ?? 'Phát triển đối tác';
  const addr = process.env.GTM_SENDER_ADDRESS ?? 'vieschool.com';
  const reply = process.env.GTM_REPLY_EMAIL ?? process.env.GTM_FROM ?? 'hello@vieschool.com';
  return [
    '--',
    'VieSchool - nền tảng luyện tiếng Anh tiểu học',
    `${name} | ${role}`,
    `${addr} | ${reply}`,
    'Nếu anh/chị không muốn nhận thêm thông tin, trả lời "KHÔNG" - chúng tôi sẽ ngừng ngay.',
  ].join('\n');
}

// ---------------- LLM channel (provider chain + JSON guard) ----------

const SYSTEM_JSON = 'Tra về DUY NHẤT một JSON object hợp lệ, không markdown, không lời dẫn.';

async function callGemini(prompt, model) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no key');
  const m = model ?? 'gemini-2.5-flash-lite';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_JSON}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAI(prompt, model) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('no key');
  const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_JSON },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(prompt, model) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('no key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model ?? 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: `${SYSTEM_JSON}\n\n${prompt}` }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = await res.json();
  return j.content?.[0]?.text ?? '';
}

const PROVIDERS = {
  gemini: callGemini,
  openai: callOpenAI,
  anthropic: callAnthropic,
};

export function llmAvailable() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

// chatJson(prompt, validate, repair) -> parsed object | null.
// Provider order: AI_PROVIDER override else gemini -> openai -> anthropic.
// One repair retry per CONVENTIONS (structured output discipline).
export async function chatJson(prompt, validate, repairPrompt) {
  const order = process.env.AI_PROVIDER
    ? [process.env.AI_PROVIDER]
    : ['gemini', 'openai', 'anthropic'];
  const model = process.env.AI_MODEL;
  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) continue;
    try {
      let raw = await fn(prompt, model);
      let obj = parseJson(raw);
      if (!obj || !validate(obj)) {
        raw = await fn(repairPrompt ?? `Output trước sai định dạng. Yêu cầu lại:\n${prompt}`, model);
        obj = parseJson(raw);
      }
      if (obj && validate(obj)) return { obj, provider: name };
    } catch {
      // next provider
    }
  }
  return null;
}

export function parseJson(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/```json|```/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function sha256(s) {
  return createHash('sha256').update(s ?? '', 'utf8').digest('hex');
}

export function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
export const hasFlag = (f) => process.argv.includes(f);
