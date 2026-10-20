// LLM exam-signoff verifier - semantic review via the shared channel
// (codex primary, gemini-web fallback - no free models).
// Structural checks run in code; the semantic pass (answer correctness,
// ambiguity, grade fit) asks the model to solve + judge each item.
// Verdicts apply directly: approve -> examEligible; unfixable -> rejected;
// uncertain -> left pending.
// Usage: node scripts/verify-codex.mjs [--grades 1,2,3,4,5] [--workers 3] [--limit 0] [--dry]
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createLlmChannel } from './llm-channel.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);
const WORKERS = Number(arg('--workers', '3'));
const LIMIT = Number(arg('--limit', '0'));
const BATCH = Number(arg('--batch', '12'));

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'count=exact' };
const OUT = 'scripts/gen-bulk-out';

async function fetchCandidates() {
  const rows = [];
  for (const g of GRADES) {
    let off = 0;
    for (;;) {
      const res = await fetch(
        `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi,passage,statement,tokens` +
        `&grade=eq.${g}&subject=eq.english` +
        `&publication_policy->>requiresHumanApprovalForExam=eq.true` +
        `&publication_policy->>mockEligible=eq.true` +
        `&review_status=neq.rejected&canonical=eq.true` +
        `&order=id&offset=${off}&limit=1000`,
        { headers: H });
      if (!res.ok) throw new Error('fetch ' + res.status);
      const chunk = await res.json();
      rows.push(...chunk);
      if (chunk.length < 1000 || (LIMIT && rows.length >= LIMIT)) break;
      off += 1000;
    }
    if (LIMIT && rows.length >= LIMIT) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

// structural gate - objective defects never reach the semantic pass
function structuralFail(r) {
  const t = r.question_type;
  if (t === 'mcq' || t === 'word-to-image-mcq' || t === 'image-to-word-mcq') {
    const c = r.choices;
    if (!Array.isArray(c) || c.length < 2) return 'no-choices';
    if (t === 'mcq') {
      const texts = c.map((x) => String(typeof x === 'string' ? x : x?.assetId ?? x).toLowerCase().trim());
      if (new Set(texts).size !== c.length) return 'dup-choices';
    }
    if (r.answer?.index === undefined && r.answer?.text === undefined) return 'no-answer';
    if (!r.prompt_text || r.prompt_text.length < 8) return 'short-prompt';
    if (t === 'mcq' && /what is this|look at the picture|which picture|nhìn hình/i.test(r.prompt_text)) return 'image-dependent';
    return null;
  }
  if (t === 'true-false') {
    if (!r.passage || r.passage.length < 10) return 'no-passage';
    if (!r.statement || r.statement.length < 5) return 'no-statement';
    if (typeof r.answer?.boolean !== 'boolean') return 'no-boolean';
    return null;
  }
  if (t === 'reorder') {
    if (!Array.isArray(r.tokens) || r.tokens.length < 3) return 'no-tokens';
    const norm = (s) => s.toLowerCase().replace(/[.!?,;:'"]/g, '').replace(/\s+/g, ' ').trim();
    if (norm(r.tokens.join(' ')) !== norm(r.answer?.text ?? '')) return 'tokens-mismatch';
    return null;
  }
  if (t === 'text-answer') {
    const acc = r.answer?.accepted ?? (r.answer?.text ? [r.answer.text] : []);
    if (!acc.length || acc.includes('open-response')) return 'unscorable';
    return null;
  }
  return null; // speaking-prompt etc: semantic handles
}

function slim(r) {
  const o = { i: r.id, t: r.question_type, q: r.prompt_text };
  if (r.choices) o.c = r.choices;
  if (r.answer) o.a = r.answer;
  if (r.passage) o.passage = r.passage;
  if (r.statement) o.statement = r.statement;
  if (r.tokens) o.tokens = r.tokens;
  return o;
}

function promptFor(grade, items) {
  return `You are an exam-board reviewer for Vietnamese primary English (grade ${grade}). Decide if each item is GOOD ENOUGH for a scored exam.
For every item output {"i":"<id>","ok":true} or {"i":"<id>","ok":false,"why":"short reason"}.
REJECT when:
- more than one answer is defensible (ambiguous, subjective clue like "big/nice", two options both fit)
- the declared answer is WRONG
- prompt cannot be answered from its own text (missing context), or references an image it does not have
- English grammar/spelling is broken
- content is wrong for the grade (way too hard/easy) or not child-appropriate
- explanation contradicts the answer
For word-to-image-mcq / image-to-word-mcq: judge only the TEXT parts (prompt wording, answer index sanity) - images are verified separately.
Output ONLY a raw JSON array, one object per item, same order.
ITEMS:
${JSON.stringify(items)}`;
}

const channel = createLlmChannel({ workers: WORKERS });

function parseOut(stdout) {
  const m = stdout.match(/\[[\s\S]*\]/g);
  if (!m) throw new Error('no-json');
  for (let i = m.length - 1; i >= 0; i--) {
    try { const arr = JSON.parse(m[i]); if (Array.isArray(arr) && arr.length) return arr; } catch { }
  }
  throw new Error('parse-fail');
}

const APPROVE_POL = { examEligible: true, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false };
const REJECT_POL = { examEligible: false, mockEligible: false, practiceEligible: false, commercialReleaseEligible: false, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false };

async function patchIds(ids, body) {
  for (let i = 0; i < ids.length; i += 200) {
    const list = ids.slice(i, i + 200).map((x) => `"${x}"`).join(',');
    const res = await fetch(`${URL}/rest/v1/qb_questions?id=in.(${list})`, { method: 'PATCH', headers: HW, body: JSON.stringify(body) });
    if (!res.ok) console.log('patch err', res.status, (await res.text()).slice(0, 120));
  }
}

const cands = await fetchCandidates();
console.log(`candidates: ${cands.length}`);
const structDrops = [], llmItems = [];
for (const r of cands) (structuralFail(r) ? structDrops : llmItems).push(r);
console.log(`structural drop: ${structDrops.length} | semantic-check: ${llmItems.length}`);
if (DRY) {
  const s = llmItems.slice(0, BATCH);
  console.log(JSON.stringify(parseOut((await channel.call(promptFor(s[0].grade, s.map(slim)))).text).slice(0, 5), null, 1));
  await channel.close();
  process.exit(0);
}

// apply structural drops immediately (objectively broken - out of all pools)
await patchIds(structDrops.map((r) => r.id), { review_status: 'rejected', publication_policy: REJECT_POL });
writeFileSync(`${OUT}/codex-verify-structural-drops.json`, JSON.stringify(structDrops.map((r) => r.id)));

const queue = [];
for (let i = 0; i < llmItems.length; i += BATCH) queue.push(llmItems.slice(i, i + BATCH));
let done = 0, okIds = [], badIds = [], errBatches = 0;
const dropReasons = [];
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const batch = queue.shift();
    try {
      const out = parseOut((await channel.call(promptFor(batch[0].grade, batch.map(slim)))).text);
      const byId = new Map(out.map((o) => [o.i, o]));
      for (const r of batch) {
        const v = byId.get(r.id);
        if (v?.ok === true) okIds.push(r.id);
        else if (v?.ok === false) { badIds.push(r.id); dropReasons.push({ id: r.id, why: v.why }); }
        // missing verdict -> leave pending (conservative)
      }
    } catch (e) {
      errBatches++;
      if (/usage limit|rate-limited/i.test(String(e))) throw e; // all channels quota-bound: abort, supervisor retries
      console.log(`  batch fail: ${String(e.message ?? e).slice(0, 100)}`);
    }
    done++;
    if (done % 10 === 0) console.log(`  ${done} batches | ok=${okIds.length} bad=${badIds.length} err=${errBatches}`);
  }
})).catch((e) => { console.log('ABORT quota:', String(e.message ?? e).slice(0, 80)); });

// apply: approve ok, reject bad (codex judged them wrong - out of all pools)
await patchIds(okIds, { review_status: 'approved', publication_policy: APPROVE_POL });
await patchIds(badIds, { review_status: 'rejected', publication_policy: REJECT_POL });
await channel.close();
writeFileSync(`${OUT}/codex-verify-approve.json`, JSON.stringify(okIds));
writeFileSync(`${OUT}/codex-verify-drop.json`, JSON.stringify(dropReasons));
console.log(`DONE verify: approved=${okIds.length} rejected=${badIds.length} structural=${structDrops.length} err-batches=${errBatches} (codex=${channel.counts.codex} gemini=${channel.counts.gemini})`);
